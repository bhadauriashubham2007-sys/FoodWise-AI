import { URL } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import { PlatformType, LinkExtractionResult, CompareByLinkResponse, FoodItem } from '../types/index.js';
import { ComparisonService, normalizeCityName, PriceOverrides } from './comparison.service.js';
import {
  extractCleanUrl,
  detectPlatformFromUrl,
  SHORT_REDIRECT_DOMAINS,
  isAllowedHost,
} from '../utils/urlValidator.js';

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
   * Checks for loopback, link-local, or private RFC1918 IPv4/IPv6 addresses to protect against SSRF.
   */
  private isPrivateOrLocalHost(host: string): boolean {
    const h = host.toLowerCase().trim();
    if (
      h === 'localhost' ||
      h.endsWith('.localhost') ||
      h === '127.0.0.1' ||
      h === '::1' ||
      h === '0.0.0.0'
    ) {
      return true;
    }

    const ipv4Match = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const b0 = parseInt(ipv4Match[1], 10);
      const b1 = parseInt(ipv4Match[2], 10);
      if (b0 === 10) return true; // 10.0.0.0/8
      if (b0 === 127) return true; // 127.0.0.0/8
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12
      if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16
      if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 link-local
    }

    return false;
  }

  /**
   * Fetches redirect Location header for an authorized URL with strict timeout.
   */
  private async fetchRedirectLocation(targetUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const u = new URL(targetUrl);
        const transport = u.protocol === 'https:' ? https : http;

        const req = transport.request(
          u,
          {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 2500,
          },
          (res) => {
            const statusCode = res.statusCode || 0;
            const loc = res.headers.location || null;
            res.destroy(); // Abort reading body immediately
            if (statusCode >= 300 && statusCode < 400 && loc) {
              resolve(loc);
            } else {
              resolve(null);
            }
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });

        req.on('error', () => {
          resolve(null);
        });

        req.end();
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Safely resolves HTTP redirects for mobile short links (e.g. zoma.to, link.zomato.com).
   * Enforces:
   * - Strict host allowlisting (redirect target MUST be an authorized platform host).
   * - HTTPS/HTTP validation only.
   * - SSRF protection: rejects loopback and private IP spaces.
   * - Maximum 4 redirect hops.
   * - 2500ms timeout per hop.
   * - Fails open to the initial valid URL on network errors or timeouts without throwing.
   */
  public async resolveRedirectsSafely(initialUrl: string): Promise<string> {
    let currentUrl = initialUrl;
    let hops = 0;
    const maxHops = 4;

    while (hops < maxHops) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        return currentUrl;
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return currentUrl;
      }

      const host = parsed.hostname.toLowerCase();
      const platform = detectPlatformFromUrl(currentUrl);
      if (platform === 'unknown') {
        return currentUrl;
      }

      if (this.isPrivateOrLocalHost(host)) {
        return currentUrl;
      }

      const isShort = SHORT_REDIRECT_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
      if (!isShort && hops > 0) {
        return currentUrl;
      }

      try {
        const nextUrl = await this.fetchRedirectLocation(currentUrl);
        if (!nextUrl || nextUrl === currentUrl) {
          return currentUrl;
        }

        const nextParsed = new URL(nextUrl, currentUrl);
        if (nextParsed.protocol !== 'http:' && nextParsed.protocol !== 'https:') {
          return currentUrl;
        }

        const nextHost = nextParsed.hostname.toLowerCase();
        if (this.isPrivateOrLocalHost(nextHost)) {
          return currentUrl;
        }

        if (detectPlatformFromUrl(nextParsed.href) === 'unknown') {
          return currentUrl;
        }

        currentUrl = nextParsed.href;
        hops++;
      } catch {
        return currentUrl;
      }
    }

    return currentUrl;
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
    // 1. Sanitize & extract URL from potential mobile share text or trailing punctuation
    const cleanUrl = extractCleanUrl(rawUrl);

    // 2. URL Structure Validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      return {
        success: false,
        extraction: {
          url: rawUrl.trim(),
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

    const initialHost = parsedUrl.hostname.toLowerCase();

    // 3. Identify Source Platform Domain (using comprehensive platform allowlist including mobile short domains)
    const initialPlatform = detectPlatformFromUrl(cleanUrl);
    if (initialPlatform === 'unknown') {
      return {
        success: false,
        extraction: {
          url: cleanUrl,
          sourcePlatform: 'unknown',
          isValidDomain: false,
          isAccessible: false,
          confidence: 'fallback_required',
          dataSource: 'url_parsed',
          extractionNotes: `Domain "${initialHost}" is not recognized as a supported food delivery platform (Zomato, Swiggy, or Toing).`,
        },
        equivalentItems: [],
        message: `The domain "${initialHost}" is not supported. FoodWise compares prices across Zomato, Swiggy, and Toing. Please paste a link from one of these platforms.`,
      };
    }

    // 4. Safely follow redirects for mobile short links (e.g. zoma.to/r/..., link.zomato.com)
    let finalUrlStr = cleanUrl;
    try {
      finalUrlStr = await this.resolveRedirectsSafely(cleanUrl);
      parsedUrl = new URL(finalUrlStr);
    } catch {
      // In case of any network timeout, continue with cleanUrl
    }

    const sourcePlatform = detectPlatformFromUrl(finalUrlStr) as PlatformType;

    // 5. Extract Details from URL including potential restaurant city
    const extracted = this.extractDetailsFromUrl(parsedUrl, sourcePlatform);

    // 6. Validate Location Alignment: Check if link restaurant's city conflicts with active city
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

    // 7. Handle Manual Fallback vs Automatic URL Extraction
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

    // 8. Automatic Extraction from Permitted URL Metadata & Slugs
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
          `Verified ${sourcePlatform.toUpperCase()} platform link, but specific dish name could not be automatically determined from the link structure.`,
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
      params.get('dish_name') ||
      params.get('item') ||
      params.get('item_name') ||
      params.get('name') ||
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
      'whopper',
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
      'tikka',
      'makhani',
      'ice-cream',
      'icecream',
      'sundae',
      'cake',
      'shake',
      'wrap',
      'curry',
      'dal',
      'paratha',
      'chole',
      'bhature',
      'pav',
      'bhaji',
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
