import { URL } from 'node:url';
import { PlatformType, LinkExtractionResult, CompareByLinkResponse, FoodItem } from '../types/index.js';
import { ComparisonService, normalizeCityName, PriceOverrides } from './comparison.service.js';

const KNOWN_CITY_SLUGS: Record<string, string> = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  jaipur: 'Jaipur',
  delhi: 'Delhi',
  newdelhi: 'Delhi',
  mumbai: 'Mumbai',
  pune: 'Pune',
  chennai: 'Chennai',
  hyderabad: 'Hyderabad',
  kolkata: 'Kolkata',
  ahmedabad: 'Ahmedabad',
  gurgaon: 'Gurgaon',
  noida: 'Noida',
};

export class LinkParserService {
  private comparisonService: ComparisonService;

  constructor(comparisonService: ComparisonService) {
    this.comparisonService = comparisonService;
  }

  /**
   * Validate and parse a food link from Zomato, Swiggy, or Toing.
   * Strictly respects:
   * 1. User's active city: prevents Bengaluru items from masquerading as other cities.
   * 2. Manual prices: uses the user's entered price for the source platform and preserves it.
   * 3. Price honesty: never invents missing platform prices for unverified items.
   */
  public async parseAndCompareLink(
    rawUrl: string,
    manualFoodName?: string,
    manualPriceRupees?: number,
    city?: string
  ): Promise<CompareByLinkResponse> {
    const cleanUrl = rawUrl.trim();

    // 1. URL Structure Validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      return {
        success: false,
        extraction: {
          url: cleanUrl,
          sourcePlatform: 'unknown',
          isValidDomain: false,
          isAccessible: false,
          confidence: 'fallback_required',
          dataSource: 'url_parsed',
          extractionNotes: 'The provided text is not a valid web URL.',
        },
        equivalentItems: [],
        message: 'Please enter a valid web URL starting with http:// or https://',
      };
    }

    // SSRF & Protocol Safety
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        success: false,
        extraction: {
          url: cleanUrl,
          sourcePlatform: 'unknown',
          isValidDomain: false,
          isAccessible: false,
          confidence: 'fallback_required',
          dataSource: 'url_parsed',
          extractionNotes: 'Invalid URL protocol.',
        },
        equivalentItems: [],
        message: 'Only HTTP and HTTPS links are allowed for security.',
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // 2. Identify Source Platform Domain
    let sourcePlatform: PlatformType | 'unknown' = 'unknown';
    if (hostname === 'zomato.com' || hostname.endsWith('.zomato.com')) {
      sourcePlatform = 'zomato';
    } else if (hostname === 'swiggy.com' || hostname.endsWith('.swiggy.com')) {
      sourcePlatform = 'swiggy';
    } else if (
      hostname === 'toingit.com' ||
      hostname.endsWith('.toingit.com') ||
      hostname === 'toing.in' ||
      hostname.endsWith('.toing.in') ||
      hostname === 'toing.com'
    ) {
      sourcePlatform = 'toing';
    } else {
      return {
        success: false,
        extraction: {
          url: cleanUrl,
          sourcePlatform: 'unknown',
          isValidDomain: false,
          isAccessible: false,
          confidence: 'fallback_required',
          dataSource: 'url_parsed',
          extractionNotes: `Domain ${hostname} is not supported. Supported platforms: Zomato, Swiggy, Toing.`,
        },
        equivalentItems: [],
        message: 'Unsupported platform domain. Please enter a link from Zomato, Swiggy, or Toing.',
      };
    }

    // 3. Extract Details from URL including potential restaurant city
    const extracted = this.extractDetailsFromUrl(parsedUrl, sourcePlatform);

    // 4. Validate Location Alignment: Check if link restaurant's city conflicts with active city
    if (extracted.city && city && city.trim() !== '') {
      const urlCityNorm = normalizeCityName(extracted.city);
      const activeCityNorm = normalizeCityName(city);

      if (urlCityNorm !== activeCityNorm) {
        return {
          success: true,
          extraction: {
            url: cleanUrl,
            sourcePlatform,
            isValidDomain: true,
            isAccessible: true,
            foodName: manualFoodName?.trim() || extracted.foodName,
            restaurantName: extracted.restaurantName,
            originalPriceRupees: manualPriceRupees,
            confidence: 'medium',
            dataSource: manualFoodName ? 'manual_fallback' : 'url_parsed',
            extractionNotes: `Link restaurant is in ${extracted.city}, but active city is ${city}.`,
          },
          equivalentItems: [],
          message: `Location Mismatch: This link points to a restaurant in ${extracted.city}, but your active city is set to ${city}. FoodWise cannot compare inter-city delivery quotes. Please switch your active city or paste a link from ${city}.`,
        };
      }
    }

    // Prepare price overrides if user provided a manual price
    const manualBasePricePaise =
      typeof manualPriceRupees === 'number' && manualPriceRupees > 0
        ? Math.round(manualPriceRupees * 100)
        : undefined;

    const priceOverrides: PriceOverrides | undefined =
      typeof manualBasePricePaise === 'number'
        ? {
            sourcePlatform,
            manualBasePricePaise,
          }
        : undefined;

    // 5. Handle Manual Fallback vs Automatic URL Extraction
    if (manualFoodName && manualFoodName.trim() !== '') {
      const foodName = manualFoodName.trim();
      const searchMatches = this.comparisonService.searchFood({ query: foodName, city });
      const candidateMatch = searchMatches[0];

      const extraction: LinkExtractionResult = {
        url: cleanUrl,
        sourcePlatform,
        isValidDomain: true,
        isAccessible: true,
        foodName,
        restaurantName: extracted.restaurantName,
        originalPriceRupees: manualPriceRupees,
        confidence: 'high',
        dataSource: 'manual_fallback',
        extractionNotes: typeof manualPriceRupees === 'number'
          ? `User manually specified "${foodName}" at ₹${manualPriceRupees} (source: ${sourcePlatform}).`
          : `Food item was manually provided by user as "${foodName}".`,
      };

      // If active city has no listings at all in our catalogue
      if (city && city.trim() !== '') {
        const anyCityListings = this.comparisonService.searchFood({ city });
        if (anyCityListings.length === 0) {
          return {
            success: true,
            extraction,
            equivalentItems: [],
            message: `No verified listings are currently available for ${city}. The available verified catalogue currently covers Bengaluru outlets. Please switch to Bengaluru in the location selector or try a local partner link.`,
          };
        }
      }

      const verification = candidateMatch ? this.verifyMatchQuality(foodName, candidateMatch) : { isAcceptable: false };

      if (!candidateMatch || !verification.isAcceptable) {
        return {
          success: true,
          extraction,
          equivalentItems: [],
          message: `Identified platform: ${sourcePlatform.toUpperCase()}, but no direct equivalent dishes were found in the catalogue for "${foodName}". Missing platform prices are not invented. Try a specific food keyword like "biryani", "pizza", or "momos".`,
        };
      }

      // Build comparison using user's manual price on the source platform
      const comparison = this.comparisonService.getComparison(candidateMatch.id, undefined, priceOverrides);
      const matchedFoodItem: FoodItem = comparison ? comparison.foodItem : candidateMatch;

      // Equivalent suggestions strictly match the same category & dietary preference
      const equivalentItems = searchMatches
        .filter((item) => item.id !== candidateMatch.id)
        .filter((item) => item.category === candidateMatch.category && item.dietary === candidateMatch.dietary)
        .slice(0, 3);

      return {
        success: true,
        extraction,
        matchedFoodItem,
        comparison: comparison || undefined,
        equivalentItems,
        cheapestQuote: comparison?.cheapestQuote,
        highestQuote: comparison?.highestQuote,
        savingsPaise: comparison?.savingsPaise,
        message: `Successfully matched "${matchedFoodItem.name}" across all platforms!`,
      };
    }

    // 6. Automatic Extraction from Permitted URL Metadata & Slugs
    if (!extracted.foodName) {
      // Prompt user for manual input fallback (Never pretend inaccessible data was retrieved)
      const extraction: LinkExtractionResult = {
        url: cleanUrl,
        sourcePlatform,
        isValidDomain: true,
        isAccessible: false,
        confidence: 'fallback_required',
        dataSource: 'url_parsed',
        extractionNotes:
          'Verified platform URL, but specific dish name could not be automatically determined from the link structure.',
      };

      return {
        success: true,
        needsManualInput: true,
        extraction,
        equivalentItems: [],
        message: `Valid ${sourcePlatform.toUpperCase()} link detected, but specific food item could not be auto-extracted. Please specify the dish name below.`,
      };
    }

    // 7. Search for equivalent dishes in our catalog respecting active city
    const searchMatches = this.comparisonService.searchFood({ query: extracted.foodName, city });
    const candidateMatch = searchMatches[0];

    const extraction: LinkExtractionResult = {
      url: cleanUrl,
      sourcePlatform,
      isValidDomain: true,
      isAccessible: true,
      foodName: extracted.foodName,
      restaurantName: extracted.restaurantName,
      originalPriceRupees: manualPriceRupees,
      confidence: extracted.confidence,
      dataSource: 'url_parsed',
      extractionNotes: `Extracted "${extracted.foodName}" ${extracted.restaurantName ? `from ${extracted.restaurantName}` : ''} via clean URL slug parsing.`,
    };

    // If active city has no listings in our catalogue
    if (city && city.trim() !== '') {
      const anyCityListings = this.comparisonService.searchFood({ city });
      if (anyCityListings.length === 0) {
        return {
          success: true,
          extraction,
          equivalentItems: [],
          message: `No verified listings are currently available for ${city}. The available verified catalogue currently covers Bengaluru outlets. Please switch to Bengaluru in the location selector or try a local partner link.`,
        };
      }
    }

    const verification = candidateMatch ? this.verifyMatchQuality(extracted.foodName, candidateMatch) : { isAcceptable: false };

    if (!candidateMatch || !verification.isAcceptable) {
      return {
        success: true,
        extraction,
        needsManualInput: true,
        equivalentItems: [],
        message: `Found food "${extracted.foodName}" on ${sourcePlatform.toUpperCase()}, but no direct equivalent exists in our catalogue. Please confirm or refine the dish name.`,
      };
    }

    const comparison = this.comparisonService.getComparison(candidateMatch.id, undefined, priceOverrides);
    const matchedFoodItem: FoodItem = comparison ? comparison.foodItem : candidateMatch;

    // Keep equivalent suggestions separate from primary matched dish
    const equivalentItems = searchMatches
      .filter((item) => item.id !== candidateMatch.id)
      .filter((item) => item.category === candidateMatch.category && item.dietary === candidateMatch.dietary)
      .slice(0, 3);

    return {
      success: true,
      extraction,
      matchedFoodItem,
      comparison: comparison || undefined,
      equivalentItems,
      cheapestQuote: comparison?.cheapestQuote,
      highestQuote: comparison?.highestQuote,
      savingsPaise: comparison?.savingsPaise,
      message: `Found "${matchedFoodItem.name}"! Showing lowest price across Zomato, Swiggy, and Toing.`,
    };
  }

  /**
   * Cross-platform matching verification:
   * Ensures dish names, dietary preference, and core food categories strictly align.
   * Prevents unrelated dishes (e.g. veg vs non-veg, or sushi matching a kathi roll) from being treated as equivalent.
   */
  private verifyMatchQuality(
    searchedDish: string,
    candidate: { name: string; category: string; dietary: string; cuisine?: string }
  ): { isAcceptable: boolean; reason?: string } {
    const s = searchedDish.toLowerCase().trim();
    const cName = candidate.name.toLowerCase();
    const cCat = candidate.category.toLowerCase();
    const cCuis = candidate.cuisine ? candidate.cuisine.toLowerCase() : '';

    // 1. Dietary mismatch check
    const isSearchedNonVeg =
      s.includes('chicken') ||
      s.includes('mutton') ||
      s.includes('fish') ||
      s.includes('egg') ||
      s.includes('meat') ||
      s.includes('non-veg');
    const isSearchedVeg =
      s.includes('veg') ||
      s.includes('paneer') ||
      s.includes('dal') ||
      s.includes('mushroom');

    if (isSearchedNonVeg && candidate.dietary === 'veg') {
      return { isAcceptable: false, reason: 'Dietary mismatch: searched non-veg but matched veg' };
    }
    if (isSearchedVeg && candidate.dietary === 'non-veg') {
      return { isAcceptable: false, reason: 'Dietary mismatch: searched veg but matched non-veg' };
    }

    // 2. Token overlap threshold - require at least 50% of meaningful tokens to match
    const tokens = s
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && t !== 'with' && t !== 'and' && t !== 'the' && t !== 'for');

    if (tokens.length > 0) {
      let matchedTokens = 0;
      for (const t of tokens) {
        if (cName.includes(t) || cCat.includes(t) || cCuis.includes(t)) {
          matchedTokens++;
        }
      }
      const ratio = matchedTokens / tokens.length;
      if (ratio < 0.5) {
        return {
          isAcceptable: false,
          reason: `Insufficient token match (${matchedTokens}/${tokens.length} matched)`,
        };
      }
    }

    // 3. Core food noun checks
    const coreNouns = [
      'biryani',
      'pizza',
      'burger',
      'momo',
      'coffee',
      'tea',
      'noodles',
      'dosa',
      'ice cream',
      'cake',
      'waffle',
      'sandwich',
      'pasta',
      'thali',
      'samosa',
      'chaat',
    ];

    for (const noun of coreNouns) {
      if (s.includes(noun) && !cName.includes(noun) && !cCat.includes(noun)) {
        return { isAcceptable: false, reason: `Category mismatch: expected ${noun}` };
      }
    }

    // 4. Unsupported foreign dish keywords
    const unsupportedKeywords = ['sushi', 'taco', 'tacos', 'burrito', 'ramen', 'dim sum', 'steak'];
    for (const uk of unsupportedKeywords) {
      if (s.includes(uk) && !cName.includes(uk)) {
        return { isAcceptable: false, reason: `Unsupported dish type: ${uk}` };
      }
    }

    return { isAcceptable: true };
  }

  /**
   * Safely extract dish and restaurant names, plus city from permitted URL query params and paths
   */
  private extractDetailsFromUrl(
    url: URL,
    platform: PlatformType
  ): { foodName?: string; restaurantName?: string; city?: string; confidence: 'high' | 'medium' } {
    const params = url.searchParams;

    // Check query parameters for city
    let foundCity: string | undefined;
    const queryCity = params.get('city');
    if (queryCity && KNOWN_CITY_SLUGS[queryCity.toLowerCase()]) {
      foundCity = KNOWN_CITY_SLUGS[queryCity.toLowerCase()];
    }

    // Check query parameters for dish
    const queryDish =
      params.get('dish') ||
      params.get('item') ||
      params.get('item_name') ||
      params.get('q') ||
      params.get('query') ||
      params.get('search');

    // Check path segments
    const segments = url.pathname
      .split('/')
      .filter((s) => s.length > 0 && s !== 'order' && s !== 'restaurants' && s !== 'menu' && s !== 'search');

    // Detect city from path segments (e.g. zomato.com/bangalore/... or /jaipur/...)
    for (const seg of segments) {
      const lower = seg.toLowerCase();
      if (KNOWN_CITY_SLUGS[lower]) {
        foundCity = KNOWN_CITY_SLUGS[lower];
        break;
      }
    }

    if (queryDish && queryDish.trim().length > 2) {
      return {
        foodName: this.cleanSlug(queryDish),
        city: foundCity,
        confidence: 'high',
      };
    }

    if (segments.length === 0) {
      return { city: foundCity, confidence: 'medium' };
    }

    // Filter out city segments when searching for food/restaurant names
    const nonCitySegments = segments.filter((s) => !KNOWN_CITY_SLUGS[s.toLowerCase()]);

    // Look for recognizable food items in segments
    const foodKeywords = [
      'biryani',
      'pizza',
      'burger',
      'momo',
      'momos',
      'coffee',
      'noodles',
      'dosa',
      'paneer',
      'chicken',
      'pasta',
      'sandwich',
      'thali',
      'chaat',
      'samosa',
      'dessert',
      'roll',
      'fries',
    ];

    let foundFood: string | undefined;
    let foundRestaurant: string | undefined;

    for (let i = nonCitySegments.length - 1; i >= 0; i--) {
      const seg = nonCitySegments[i].toLowerCase();
      const hasFoodKeyword = foodKeywords.some((kw) => seg.includes(kw));

      if (hasFoodKeyword && !foundFood) {
        foundFood = this.cleanSlug(nonCitySegments[i]);
      } else if (!foundRestaurant && seg.length > 3 && !hasFoodKeyword && isNaN(Number(seg))) {
        foundRestaurant = this.cleanSlug(nonCitySegments[i]);
      }
    }

    // If no explicit food keyword was in the slug, but there's a specific dish-like slug
    if (!foundFood && nonCitySegments.length >= 1) {
      const lastSeg = nonCitySegments[nonCitySegments.length - 1];
      if (lastSeg.includes('-') && lastSeg.length > 5 && isNaN(Number(lastSeg))) {
        foundFood = this.cleanSlug(lastSeg);
      }
    }

    return {
      foodName: foundFood,
      restaurantName: foundRestaurant,
      city: foundCity,
      confidence: foundFood ? 'high' : 'medium',
    };
  }

  /**
   * Convert hyphenated/underscored slug to human-readable title
   */
  private cleanSlug(slug: string): string {
    return slug
      .replace(/[-_+]/g, ' ')
      .replace(/\b\d{5,}\b/g, '') // remove trailing ids like -123456
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
