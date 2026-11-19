import { URL } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import {
  PlatformType,
  LinkExtractionResult,
  CompareByLinkResponse,
  FoodItem,
  MatchType,
  LinkDataSource,
} from '../types/index.js';
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

    // Detect if this is an AppsFlyer OneLink or native app deep link with no public web destination
    const parsedFinalUrl = parsedUrl;
    const deepLinkVal =
      parsedFinalUrl.searchParams.get('deep_link_value') ||
      parsedFinalUrl.searchParams.get('af_dp');
    const isOneLink =
      initialHost.includes('onelink.me') ||
      parsedFinalUrl.hostname.toLowerCase().includes('onelink.me');

    const hasReadableDishParam = Boolean(
      parsedFinalUrl.searchParams.get('dish') ||
      parsedFinalUrl.searchParams.get('dish_name') ||
      parsedFinalUrl.searchParams.get('item') ||
      parsedFinalUrl.searchParams.get('item_name')
    );

    const isOpaqueAppDeepLink =
      isOneLink &&
      !hasReadableDishParam &&
      (
        Boolean(deepLinkVal && deepLinkVal.includes('resolve_link?id=')) ||
        (initialHost.includes('onelink.me') && !extracted.foodName)
      );

    // 5b. Attempt safe HTML metadata scraping if URL slug didn't reveal a specific dish
    let extractedFoodName = extracted.foodName;
    let extractedRestaurantName = extracted.restaurantName;
    let dataSource: LinkDataSource = 'url_parsed';
    let isGenericLandingPage = false;

    if (!isOpaqueAppDeepLink && !extractedFoodName && (!manualFoodName || manualFoodName.trim() === '')) {
      const metadata = await this.fetchHtmlMetadata(finalUrlStr);
      if (metadata.foodName) {
        extractedFoodName = metadata.foodName;
        extractedRestaurantName = metadata.restaurantName || extractedRestaurantName;
        dataSource = 'metadata_scraped';
      }
      if (metadata.isGenericLandingPage) {
        isGenericLandingPage = true;
      }
    }

    // 6. Validate Location Alignment: Check if link restaurant's city conflicts with active city
    if (extracted.city && city && city.trim() !== '') {
      const urlCityNorm = normalizeCityName(extracted.city);
      const activeCityNorm = normalizeCityName(city);

      if (urlCityNorm !== activeCityNorm) {
        return {
          success: true,
          extraction: {
            url: cleanUrl,
            resolvedUrl: finalUrlStr,
            sourcePlatform,
            isValidDomain: true,
            isAccessible: true,
            foodName: manualFoodName?.trim() || extractedFoodName,
            restaurantName: extractedRestaurantName,
            originalPriceRupees: manualPriceRupees,
            confidence: 'medium',
            dataSource: manualFoodName ? 'manual_fallback' : dataSource,
            isOpaqueAppDeepLink,
            isGenericLandingPage,
            extractionNotes: `Link restaurant is in ${extracted.city}, but active city is set to ${city}. FoodWise compares local prices within the same operational city.`,
          },
          matchType: 'none',
          equivalentItems: [],
          dataProvenance: 'demo_catalogue',
          disclosureNote:
            'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
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

    // 7. Handle Opaque Mobile In-App Share Links (e.g. zomato.onelink.me without web catalog)
    if (isOpaqueAppDeepLink && (!manualFoodName || manualFoodName.trim() === '')) {
      const extraction: LinkExtractionResult = {
        url: cleanUrl,
        resolvedUrl: finalUrlStr,
        sourcePlatform,
        isValidDomain: true,
        isAccessible: false,
        confidence: 'fallback_required',
        dataSource: 'url_parsed',
        isOpaqueAppDeepLink: true,
        isGenericLandingPage: true,
        extractionNotes:
          'Detected Zomato mobile app share link (AppsFlyer OneLink). This link routes directly into the installed Zomato mobile application via an internal app token (resolve_link) rather than a public web page. To compare prices across Zomato, Swiggy, and Toing, please specify the food item name below.',
      };

      return {
        success: true,
        needsManualInput: true,
        extraction,
        matchType: 'none',
        equivalentItems: [],
        dataProvenance: 'demo_catalogue',
        disclosureNote:
          'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
        message:
          'Mobile app share link detected. This link routes directly into the Zomato native app rather than a public web page. Please enter or confirm the dish name below to compare prices across Zomato, Swiggy, and Toing.',
      };
    }

    // 8. Handle Manual Fallback Input (User provided dish name or refined search)
    if (manualFoodName && manualFoodName.trim() !== '') {
      const foodName = manualFoodName.trim();
      const searchMatches = this.comparisonService.searchFood({ query: foodName, city });
      const candidateMatch = searchMatches[0];

      const extraction: LinkExtractionResult = {
        url: cleanUrl,
        resolvedUrl: finalUrlStr,
        sourcePlatform,
        isValidDomain: true,
        isAccessible: true,
        foodName,
        restaurantName: extractedRestaurantName,
        originalPriceRupees: manualPriceRupees,
        confidence: 'high',
        dataSource: 'manual_fallback',
        isOpaqueAppDeepLink,
        isGenericLandingPage,
        extractionNotes:
          typeof manualPriceRupees === 'number'
            ? `User manually specified "${foodName}" at ₹${manualPriceRupees} (source: ${sourcePlatform}).`
            : `Food item was manually provided by user as "${foodName}".`,
      };

      // If active city has no listings in our catalogue
      if (city && city.trim() !== '') {
        const anyCityListings = this.comparisonService.searchFood({ city });
        if (anyCityListings.length === 0) {
          return {
            success: true,
            extraction,
            matchType: 'none',
            equivalentItems: [],
            dataProvenance: 'demo_catalogue',
            disclosureNote:
              'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
            message: `No listings are currently available in the demo catalogue for ${city}. The available demo catalogue currently covers Bengaluru outlets. Please switch to Bengaluru in the location selector.`,
          };
        }
      }

      const verification = candidateMatch
        ? this.verifyMatchQuality(foodName, candidateMatch)
        : { isAcceptable: false, matchType: 'none' as MatchType, matchScore: 0 };

      if (!candidateMatch || !verification.isAcceptable || verification.matchType === 'none') {
        return {
          success: true,
          extraction,
          needsManualInput: true,
          matchType: 'none',
          equivalentItems: [],
          dataProvenance: 'demo_catalogue',
          disclosureNote:
            'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
          message: `Identified platform: ${sourcePlatform.toUpperCase()}, but no direct equivalent dishes were found in the demo catalogue for "${foodName}". Missing platform prices are not invented. Try a specific food keyword like "biryani", "pizza", or "momos".`,
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
        needsManualInput: false,
        extraction,
        matchedFoodItem,
        matchType: verification.matchType,
        matchScore: verification.matchScore,
        comparison: comparison || undefined,
        equivalentItems,
        cheapestQuote: comparison?.cheapestQuote,
        highestQuote: comparison?.highestQuote,
        savingsPaise: comparison?.savingsPaise,
        dataProvenance: 'demo_catalogue',
        disclosureNote:
          'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
        message:
          verification.matchType === 'exact'
            ? `Found exact name match "${matchedFoodItem.name}" in demo catalogue! Showing price comparison across Zomato, Swiggy, and Toing.`
            : `Matched similar name "${matchedFoodItem.name}" (${Math.round(verification.matchScore * 100)}% text similarity for "${foodName}") in demo catalogue. Showing price comparison across Zomato, Swiggy, and Toing.`,
      };
    }

    // 9. Automatic Extraction: If food name could not be automatically determined
    if (!extractedFoodName) {
      const extraction: LinkExtractionResult = {
        url: cleanUrl,
        resolvedUrl: finalUrlStr,
        sourcePlatform,
        isValidDomain: true,
        isAccessible: false,
        confidence: 'fallback_required',
        dataSource: 'url_parsed',
        restaurantName: extractedRestaurantName,
        isOpaqueAppDeepLink,
        isGenericLandingPage,
        extractionNotes: extractedRestaurantName
          ? `Identified restaurant "${extractedRestaurantName}" on ${sourcePlatform.toUpperCase()}, but specific dish name could not be automatically determined from the page metadata or link structure.`
          : `Verified ${sourcePlatform.toUpperCase()} platform link, but specific dish name could not be automatically determined from the page metadata or link structure.`,
      };

      return {
        success: true,
        needsManualInput: true,
        extraction,
        matchType: 'none',
        equivalentItems: [],
        dataProvenance: 'demo_catalogue',
        disclosureNote:
          'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
        message: extractedRestaurantName
          ? `Identified restaurant "${extractedRestaurantName}" on ${sourcePlatform.toUpperCase()}, but specific food item could not be auto-extracted. Please specify the dish name below to compare prices.`
          : `Valid ${sourcePlatform.toUpperCase()} link detected, but specific food item could not be auto-extracted. Please specify the dish name below to compare prices.`,
      };
    }

    // 10. Automatic Search in Catalogue using Extracted Food Name
    const searchMatches = this.comparisonService.searchFood({ query: extractedFoodName, city });
    const candidateMatch = searchMatches[0];

    const extraction: LinkExtractionResult = {
      url: cleanUrl,
      resolvedUrl: finalUrlStr,
      sourcePlatform,
      isValidDomain: true,
      isAccessible: true,
      foodName: extractedFoodName,
      restaurantName: extractedRestaurantName,
      originalPriceRupees: manualPriceRupees,
      confidence: extracted.confidence,
      dataSource,
      isOpaqueAppDeepLink: false,
      isGenericLandingPage: false,
      extractionNotes:
        dataSource === 'metadata_scraped'
          ? `Automatically extracted "${extractedFoodName}" ${extractedRestaurantName ? `from ${extractedRestaurantName}` : ''} via web page metadata.`
          : `Extracted "${extractedFoodName}" ${extractedRestaurantName ? `from ${extractedRestaurantName}` : ''} via clean URL slug parsing.`,
    };

    // If active city has no listings in our catalogue
    if (city && city.trim() !== '') {
      const anyCityListings = this.comparisonService.searchFood({ city });
      if (anyCityListings.length === 0) {
        return {
          success: true,
          extraction,
          matchType: 'none',
          equivalentItems: [],
          dataProvenance: 'demo_catalogue',
          disclosureNote:
            'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
          message: `No listings are currently available in the demo catalogue for ${city}. The available demo catalogue currently covers Bengaluru outlets. Please switch to Bengaluru in the location selector.`,
        };
      }
    }

    const verification = candidateMatch
      ? this.verifyMatchQuality(extractedFoodName, candidateMatch)
      : { isAcceptable: false, matchType: 'none' as MatchType, matchScore: 0 };

    if (!candidateMatch || !verification.isAcceptable || verification.matchType === 'none') {
      return {
        success: true,
        extraction,
        needsManualInput: true,
        matchType: 'none',
        equivalentItems: [],
        dataProvenance: 'demo_catalogue',
        disclosureNote:
          'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
        message: `Found food "${extractedFoodName}" on ${sourcePlatform.toUpperCase()}, but no direct equivalent exists in our demo catalogue. Please confirm or refine the dish name.`,
      };
    }

    // Automatic match successful: build comparison without prompting manual input!
    const comparison = this.comparisonService.getComparison(candidateMatch.id, undefined, priceOverrides);
    const matchedFoodItem: FoodItem = comparison ? comparison.foodItem : candidateMatch;

    // Keep equivalent suggestions separate from primary matched dish
    const equivalentItems = searchMatches
      .filter((item) => item.id !== candidateMatch.id)
      .filter((item) => item.category === candidateMatch.category && item.dietary === candidateMatch.dietary)
      .slice(0, 3);

    return {
      success: true,
      needsManualInput: false,
      extraction,
      matchedFoodItem,
      matchType: verification.matchType,
      matchScore: verification.matchScore,
      comparison: comparison || undefined,
      equivalentItems,
      cheapestQuote: comparison?.cheapestQuote,
      highestQuote: comparison?.highestQuote,
      savingsPaise: comparison?.savingsPaise,
      dataProvenance: 'demo_catalogue',
      disclosureNote:
        'FoodWise Demo Catalogue Data: Reference prices from our curated demo catalogue are used for comparison.',
      message:
        verification.matchType === 'exact'
          ? `Found exact name match "${matchedFoodItem.name}" in demo catalogue! Showing lowest price across Zomato, Swiggy, and Toing.`
          : `Matched similar name "${matchedFoodItem.name}" (${Math.round(verification.matchScore * 100)}% text similarity for "${extractedFoodName}") in demo catalogue. Showing lowest price across Zomato, Swiggy, and Toing.`,
    };
  }

  /**
   * Cross-platform matching verification:
   * Ensures dish names, dietary preference, and core food categories strictly align.
   * Clearly distinguishes exact matches, similar alternatives, and unavailable dishes.
   */
  public verifyMatchQuality(
    searchedDish: string,
    candidate: { name: string; category: string; dietary: string; cuisine?: string }
  ): { isAcceptable: boolean; matchType: MatchType; matchScore: number; reason?: string } {
    const s = searchedDish.toLowerCase().trim();
    const cName = candidate.name.toLowerCase().trim();
    const cCat = candidate.category.toLowerCase();
    const cCuis = candidate.cuisine ? candidate.cuisine.toLowerCase() : '';

    // 1. Dietary mismatch check (veg vs non-veg must NEVER mix)
    const isSearchedNonVeg =
      s.includes('chicken') ||
      s.includes('mutton') ||
      s.includes('fish') ||
      s.includes('egg') ||
      s.includes('meat') ||
      s.includes('non-veg') ||
      s.includes('prawn');
    const isSearchedVeg =
      s.includes('veg') ||
      s.includes('paneer') ||
      s.includes('dal') ||
      s.includes('mushroom') ||
      s.includes('gobi') ||
      s.includes('aloo');

    if (isSearchedNonVeg && candidate.dietary === 'veg') {
      return {
        isAcceptable: false,
        matchType: 'none',
        matchScore: 0,
        reason: 'Dietary mismatch: searched non-veg but candidate is veg',
      };
    }
    if (isSearchedVeg && candidate.dietary === 'non-veg') {
      return {
        isAcceptable: false,
        matchType: 'none',
        matchScore: 0,
        reason: 'Dietary mismatch: searched veg but candidate is non-veg',
      };
    }

    // 2. Unsupported foreign dish keywords
    const unsupportedKeywords = ['sushi', 'taco', 'tacos', 'burrito', 'ramen', 'dim sum', 'steak'];
    for (const uk of unsupportedKeywords) {
      if (s.includes(uk) && !cName.includes(uk)) {
        return {
          isAcceptable: false,
          matchType: 'none',
          matchScore: 0,
          reason: `Unsupported dish type: ${uk}`,
        };
      }
    }

    // 3. Core food noun checks (e.g. biryani cannot match pizza or momos)
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
      'roll',
    ];

    for (const noun of coreNouns) {
      if (s.includes(noun) && !cName.includes(noun) && !cCat.includes(noun)) {
        return {
          isAcceptable: false,
          matchType: 'none',
          matchScore: 0,
          reason: `Category mismatch: expected ${noun}`,
        };
      }
    }

    // 4. Token normalization & string equality
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const normS = normalize(s);
    const normC = normalize(cName);

    // Exact string match after punctuation and whitespace stripping
    if (normS === normC) {
      return { isAcceptable: true, matchType: 'exact', matchScore: 1.0 };
    }

    const stopWords = new Set(['with', 'and', 'the', 'for', 'from', 'order', 'online', 'single', 'pcs', 'special']);
    const tokensS = normS
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));
    const tokensC = normC
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));

    if (tokensS.length === 0 || tokensC.length === 0) {
      return {
        isAcceptable: false,
        matchType: 'none',
        matchScore: 0,
        reason: 'Insufficient search keywords',
      };
    }

    // Identical token sets (e.g. word order difference like "Dum Biryani Chicken" vs "Chicken Dum Biryani")
    const setS = new Set(tokensS);
    const setC = new Set(tokensC);
    const isSameTokenSet =
      setS.size === setC.size && [...setS].every((t) => setC.has(t));

    if (isSameTokenSet) {
      return { isAcceptable: true, matchType: 'exact', matchScore: 1.0 };
    }

    // Bidirectional Overlap: Sørensen–Dice Coefficient (2 * |Intersection| / (|S| + |C|))
    let intersectionCount = 0;
    for (const t of setS) {
      if (setC.has(t)) {
        intersectionCount++;
      }
    }

    const recall = intersectionCount / setS.size;
    const diceCoefficient = (2 * intersectionCount) / (setS.size + setC.size);
    const matchScore = Math.round(diceCoefficient * 100) / 100;

    // Must match at least 50% of user query tokens and have a Dice score >= 0.40
    if (recall < 0.5 || diceCoefficient < 0.40) {
      return {
        isAcceptable: false,
        matchType: 'none',
        matchScore,
        reason: `Insufficient token match (recall: ${Math.round(recall * 100)}%, dice: ${Math.round(diceCoefficient * 100)}%)`,
      };
    }

    // An approximate match can NEVER receive 1.0. Maximum score for an approximate match is capped at 0.95.
    const cappedScore = Math.min(matchScore, 0.95);

    return {
      isAcceptable: true,
      matchType: 'close_equivalent',
      matchScore: cappedScore,
    };
  }

  /**
   * Safely fetches page HTML to extract OpenGraph (og:title, og:description),
   * Schema.org JSON-LD structured data, and HTML <title>.
   * Strictly enforces:
   * - Destination host must be an authorized platform host.
   * - SSRF protection: rejects loopback and private RFC1918 IPs.
   * - Maximum 64KB body read to prevent memory exhaustion.
   * - 3000ms timeout with immediate abort.
   * - Fails gracefully on any network error or non-200 status.
   */
  public async fetchHtmlMetadata(
    targetUrl: string
  ): Promise<{
    foodName?: string;
    restaurantName?: string;
    rawTitle?: string;
    isGenericLandingPage?: boolean;
  }> {
    return new Promise((resolve) => {
      try {
        const u = new URL(targetUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return resolve({});
        }

        const host = u.hostname.toLowerCase();
        const detectedPlatform = detectPlatformFromUrl(targetUrl);
        if (
          detectedPlatform === 'unknown' ||
          this.isPrivateOrLocalHost(host) ||
          !isAllowedHost(host, detectedPlatform)
        ) {
          return resolve({});
        }

        const transport = u.protocol === 'https:' ? https : http;
        const req = transport.request(
          u,
          {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 3000,
          },
          (res) => {
            const statusCode = res.statusCode || 0;
            if (statusCode < 200 || statusCode >= 300) {
              res.destroy();
              return resolve({});
            }

            let body = '';
            let bytesRead = 0;
            const maxBytes = 65536; // 64 KB limit

            res.setEncoding('utf8');
            res.on('data', (chunk: string) => {
              body += chunk;
              bytesRead += Buffer.byteLength(chunk, 'utf8');
              if (bytesRead >= maxBytes) {
                res.destroy();
              }
            });

            res.on('end', () => {
              const parsed = this.parseHtmlMetadataString(body);
              resolve(parsed);
            });

            res.on('close', () => {
              const parsed = this.parseHtmlMetadataString(body);
              resolve(parsed);
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve({});
        });

        req.on('error', () => {
          resolve({});
        });

        req.end();
      } catch {
        resolve({});
      }
    });
  }

  /**
   * Extracts food name, restaurant name, and page title from HTML markup
   * without executing any scripts.
   */
  public parseHtmlMetadataString(html: string): {
    foodName?: string;
    restaurantName?: string;
    rawTitle?: string;
    isGenericLandingPage?: boolean;
  } {
    if (!html || html.trim() === '') {
      return {};
    }

    const lowerHtml = html.toLowerCase();
    const isGenericLanding =
      lowerHtml.includes('zomato mobile') ||
      lowerHtml.includes('download the free zomato app') ||
      lowerHtml.includes('download the swiggy app') ||
      lowerHtml.includes('order food online on app');

    // Extract OpenGraph Title & Description
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogTitle = ogTitleMatch ? this.decodeHtmlEntities(ogTitleMatch[1].trim()) : undefined;

    // Extract Twitter Title
    const twitterTitleMatch =
      html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
    const twitterTitle = twitterTitleMatch ? this.decodeHtmlEntities(twitterTitleMatch[1].trim()) : undefined;

    // Extract HTML <title>
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleTag = titleTagMatch ? this.decodeHtmlEntities(titleTagMatch[1].trim()) : undefined;

    const rawTitle = ogTitle || twitterTitle || titleTag;

    if (
      rawTitle &&
      (rawTitle.toLowerCase() === 'zomato mobile' ||
        rawTitle.toLowerCase().includes('download the free zomato app') ||
        rawTitle.toLowerCase() === 'swiggy' ||
        rawTitle.toLowerCase() === 'toing' ||
        rawTitle.toLowerCase().includes('order food online on app'))
    ) {
      return {
        rawTitle,
        isGenericLandingPage: true,
      };
    }

    // Try JSON-LD structured data
    let jsonLdFood: string | undefined;
    let jsonLdRestaurant: string | undefined;
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonMatch: RegExpExecArray | null;

    while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const type = (item['@type'] || '').toLowerCase();
          if (type === 'product' || type === 'menuitem') {
            if (item.name && typeof item.name === 'string') {
              jsonLdFood = this.cleanExtractedTitle(item.name);
            }
          }
          if (type === 'restaurant' || type === 'foodestablishment') {
            if (item.name && typeof item.name === 'string') {
              jsonLdRestaurant = this.cleanExtractedTitle(item.name);
            }
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }

    if (jsonLdFood) {
      return {
        foodName: jsonLdFood,
        restaurantName: jsonLdRestaurant,
        rawTitle,
        isGenericLandingPage: false,
      };
    }

    // Parse food and restaurant from candidate title string
    const candidateTitle = ogTitle || twitterTitle || titleTag;
    if (candidateTitle) {
      const parsedFromTitle = this.extractDishAndRestaurantFromTitle(candidateTitle);
      if (parsedFromTitle.foodName || parsedFromTitle.restaurantName) {
        return {
          foodName: parsedFromTitle.foodName,
          restaurantName: parsedFromTitle.restaurantName || jsonLdRestaurant,
          rawTitle,
          isGenericLandingPage: false,
        };
      }
    }

    return {
      rawTitle,
      restaurantName: jsonLdRestaurant,
      isGenericLandingPage: isGenericLanding,
    };
  }

  /**
   * Helper to clean strings extracted from meta or JSON-LD
   */
  public cleanExtractedTitle(title: string): string {
    return title
      .replace(/\s*\|\s*Zomato.*$/i, '')
      .replace(/\s*-\s*Zomato.*$/i, '')
      .replace(/\s*\|\s*Swiggy.*$/i, '')
      .replace(/\s*-\s*Order Online.*$/i, '')
      .replace(/\s*-\s*Swiggy.*$/i, '')
      .replace(/\s*\|\s*Toing.*$/i, '')
      .replace(/\s*-\s*Toing.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse dish and restaurant names from formatted title tag or og:title
   */
  public extractDishAndRestaurantFromTitle(title: string): {
    foodName?: string;
    restaurantName?: string;
  } {
    const cleaned = this.cleanExtractedTitle(title);

    // Pattern 1: "Order <Dish> from <Restaurant>..." (Swiggy / Zomato order titles)
    const orderFromMatch = cleaned.match(/^Order\s+(.+?)\s+from\s+(.+?)(?:,\s*.*)?$/i);
    if (orderFromMatch) {
      return {
        foodName: orderFromMatch[1].trim(),
        restaurantName: orderFromMatch[2].trim(),
      };
    }

    // Pattern 2: "<Dish> at <Restaurant>" (Zomato dish titles)
    const dishAtMatch = cleaned.match(/^(.+?)\s+at\s+(.+?)(?:,\s*.*)?$/i);
    if (dishAtMatch) {
      return {
        foodName: dishAtMatch[1].trim(),
        restaurantName: dishAtMatch[2].trim(),
      };
    }

    // Pattern 3: Separated by | or - (e.g. "Spicy Paneer Tikka Pizza | La Pino'z Pizza")
    const parts = cleaned.split(/\s+[|\-]\s+/).map((p) => p.trim());
    if (parts.length >= 2) {
      const p0 = parts[0].toLowerCase();
      if (!p0.includes('restaurant') && !p0.includes('order online') && !p0.includes('delivery')) {
        return {
          foodName: parts[0],
          restaurantName: parts[1],
        };
      }
    }

    if (
      cleaned.length > 2 &&
      !cleaned.toLowerCase().includes('restaurant') &&
      !cleaned.toLowerCase().includes('order food online')
    ) {
      return {
        foodName: cleaned,
      };
    }

    return {};
  }

  /**
   * Decode common HTML entities
   */
  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
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

    // If no explicit food keyword was in the slug, only treat as food if there are 2+ segments (restaurant/dish)
    if (!foundFood && nonCitySegments.length >= 2) {
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
