import { ZomatoAdapter } from '../adapters/zomato.adapter.js';
import { SwiggyAdapter } from '../adapters/swiggy.adapter.js';
import { ToingAdapter } from '../adapters/toing.adapter.js';
import {
  FoodItem,
  PlatformPriceQuote,
  ComparisonResult,
  CouponRule,
  PlatformType,
  SearchFilters,
  SearchIntent,
} from '../types/index.js';
import { DEMO_FOOD_ITEMS, RawFoodTemplate } from '../data/demoData.js';
import { verifyLiveProvenanceProof } from '../security/provenanceVerifier.js';

/**
 * Helper to normalize city names for reliable matching
 */
export function normalizeCityName(city?: string): string {
  if (!city || typeof city !== 'string') return '';
  const firstPart = city.split(',')[0].trim().toLowerCase();
  if (firstPart === 'bangalore') return 'bengaluru';
  if (firstPart.includes('delhi')) return 'delhi';
  return firstPart;
}

/**
 * Safely resolves data provenance from raw template metadata.
 * Live provenance MUST require valid cryptographic verification evidence signed by the server
 * and issued by an authorized live provider within the validity TTL.
 * Client-controlled booleans (e.g. isVerifiedLiveSource: true) or unverified provider strings
 * are strictly rejected.
 * Unverified sources default to 'unknown', NEVER automatically 'live_verified'.
 * Existing demo records (isDemoData !== false) are labeled 'demo_catalogue'.
 */
export function resolveDataProvenance(raw: RawFoodTemplate): 'demo_catalogue' | 'live_verified' | 'unknown' {
  // Validate actual server-side cryptographic verification evidence if present
  if (raw.liveVerificationProof) {
    const verification = verifyLiveProvenanceProof(raw.id || '', raw.liveVerificationProof);
    if (verification.isValid) {
      return 'live_verified';
    }
  }

  // If isDemoData is explicitly false, or dataProvenance claims live_verified/unknown without valid proof, default to unknown
  if (raw.isDemoData === false || raw.dataProvenance === 'live_verified' || raw.dataProvenance === 'unknown') {
    return 'unknown';
  }

  // All demo catalogue items default to demo_catalogue
  return 'demo_catalogue';
}

export interface PriceOverrides {
  sourcePlatform?: PlatformType;
  manualBasePricePaise?: number;
}

export const FOOD_SYNONYMS: Record<string, string[]> = {
  tea: ['chai', 'tea'],
  chai: ['chai', 'tea'],
  coffee: ['coffee', 'latte', 'cappuccino', 'espresso', 'macchiato'],
  momo: ['momo', 'momos', 'dimsum', 'dimsums', 'dumpling', 'dumplings'],
  momos: ['momo', 'momos', 'dimsum', 'dimsums', 'dumpling', 'dumplings'],
  dimsum: ['momo', 'momos', 'dimsum', 'dimsums', 'dumpling', 'dumplings'],
  dimsums: ['momo', 'momos', 'dimsum', 'dimsums', 'dumpling', 'dumplings'],
  burger: ['burger', 'burgers', 'whopper'],
  burgers: ['burger', 'burgers', 'whopper'],
  whopper: ['burger', 'burgers', 'whopper'],
  fries: ['fries', 'french fries'],
  dosa: ['dosa', 'dosas'],
  dosas: ['dosa', 'dosas'],
  biryani: ['biryani', 'biryanis'],
  biryanis: ['biryani', 'biryanis'],
  pizza: ['pizza', 'pizzas'],
  pizzas: ['pizza', 'pizzas'],
  noodle: ['noodle', 'noodles', 'chowmein'],
  noodles: ['noodle', 'noodles', 'chowmein'],
  egg: ['egg', 'anda'],
  ice: ['ice'],
};

export const DISH_FORMAT_NOUNS = new Set([
  'pizza', 'pizzas',
  'burger', 'burgers', 'whopper',
  'biryani', 'biryanis',
  'momo', 'momos', 'dimsum', 'dimsums', 'dumpling', 'dumplings',
  'dosa', 'dosas',
  'idli', 'idlis',
  'vada', 'vadas',
  'noodle', 'noodles', 'chowmein',
  'roll', 'rolls', 'wrap', 'wraps',
  'fries',
  'samosa', 'samosas',
  'coffee', 'latte', 'cappuccino', 'espresso', 'macchiato',
  'tea', 'chai',
  'sundae', 'cake', 'churros', 'brownie',
  'pasta'
]);

const STOP_WORDS = new Set([
  'in', 'at', 'on', 'of', 'and', 'or', 'for', 'with', 'the', 'a', 'an', 'is', 'to', 'find', 'show', 'me', 'get'
]);

/**
 * Safely checks if a phrase matches within target text at word boundaries,
 * avoiding substring collisions (e.g. "tea" in "steamed", "ice" in "rice").
 * Optionally checks deliberate food synonyms (e.g. tea -> chai).
 */
export function phraseMatchesText(targetText: string, phrase: string, checkSynonyms = false): boolean {
  if (!targetText || !phrase) return false;
  const normalizedText = targetText.toLowerCase();
  const normalizedPhrase = phrase.toLowerCase().trim();
  if (!normalizedPhrase) return false;

  const phrasesToCheck = checkSynonyms
    ? FOOD_SYNONYMS[normalizedPhrase] || [normalizedPhrase]
    : [normalizedPhrase];

  for (const p of phrasesToCheck) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b|\\s|[^a-zA-Z0-9-])${escaped}($|\\b|\\s|[^a-zA-Z0-9-])`, 'i');
    if (regex.test(normalizedText)) return true;
  }
  return false;
}

/**
 * Checks whether a search token matches any word in a target word list.
 * Prevents false substring matches:
 * - "tea" does NOT match "steamed"
 * - "egg" does NOT match "veggie"
 * - "ice" does NOT match "rice" or "spice"
 * Respects explicit food synonyms (e.g. tea -> chai).
 */
export function tokenMatchesWords(targetWords: string[], token: string, stemmed: string): boolean {
  const synonyms = FOOD_SYNONYMS[token] || FOOD_SYNONYMS[stemmed] || [token, stemmed];
  const allVariants = new Set<string>([token, stemmed, ...synonyms]);

  for (const word of targetWords) {
    if (allVariants.has(word)) return true;

    // For longer words (>= 5 chars), allow stem/prefix match if both share a common root
    // Never allow short tokens like "tea", "ice", "egg" to match as prefixes/stems
    if (token.length >= 5 && stemmed.length >= 4 && word.length >= 5) {
      if (word.startsWith(stemmed) || stemmed.startsWith(word)) {
        return true;
      }
    }
  }
  return false;
}

export class ComparisonService {
  private zomatoAdapter = new ZomatoAdapter();
  private swiggyAdapter = new SwiggyAdapter();
  private toingAdapter = new ToingAdapter();

  /**
   * Enrich raw food template into fully calculated FoodItem with real-time quote comparisons
   */
  public buildFoodItem(
    raw: RawFoodTemplate,
    couponPreferences?: Record<PlatformType, string>,
    priceOverrides?: PriceOverrides
  ): FoodItem {
    const restaurantId =
      raw.restaurantId ||
      ('rest-' + raw.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    const baseContext = {
      itemName: raw.name,
      restaurantId,
      restaurantName: raw.restaurantName,
    };

    const isZomatoUserEntered =
      priceOverrides?.sourcePlatform === 'zomato' && typeof priceOverrides.manualBasePricePaise === 'number';
    const isSwiggyUserEntered =
      priceOverrides?.sourcePlatform === 'swiggy' && typeof priceOverrides.manualBasePricePaise === 'number';
    const isToingUserEntered =
      priceOverrides?.sourcePlatform === 'toing' && typeof priceOverrides.manualBasePricePaise === 'number';

    const zomatoBasePrice = isZomatoUserEntered
      ? (priceOverrides!.manualBasePricePaise as number)
      : raw.basePricesPaise.zomato;

    const swiggyBasePrice = isSwiggyUserEntered
      ? (priceOverrides!.manualBasePricePaise as number)
      : raw.basePricesPaise.swiggy;

    const toingBasePrice = isToingUserEntered
      ? (priceOverrides!.manualBasePricePaise as number)
      : raw.basePricesPaise.toing;

    const defaultProvenance = resolveDataProvenance(raw);

    const zomatoQuote = {
      ...this.zomatoAdapter.calculateQuote(
        raw.id,
        zomatoBasePrice,
        raw.distanceKm,
        couponPreferences?.zomato,
        {
          ...baseContext,
          sourceUrl: raw.sourceUrls?.zomato,
          isUserEnteredPrice: isZomatoUserEntered,
          priceProvenance: isZomatoUserEntered ? 'user_entered' : defaultProvenance,
        }
      ),
      isUserEnteredPrice: isZomatoUserEntered,
    };

    const swiggyQuote = {
      ...this.swiggyAdapter.calculateQuote(
        raw.id,
        swiggyBasePrice,
        raw.distanceKm,
        couponPreferences?.swiggy,
        {
          ...baseContext,
          sourceUrl: raw.sourceUrls?.swiggy,
          isUserEnteredPrice: isSwiggyUserEntered,
          priceProvenance: isSwiggyUserEntered ? 'user_entered' : defaultProvenance,
        }
      ),
      isUserEnteredPrice: isSwiggyUserEntered,
    };

    const toingQuote = {
      ...this.toingAdapter.calculateQuote(
        raw.id,
        toingBasePrice,
        raw.distanceKm,
        couponPreferences?.toing,
        {
          ...baseContext,
          sourceUrl: raw.sourceUrls?.toing,
          isUserEnteredPrice: isToingUserEntered,
          priceProvenance: isToingUserEntered ? 'user_entered' : defaultProvenance,
        }
      ),
      isUserEnteredPrice: isToingUserEntered,
    };

    const quotes: PlatformPriceQuote[] = [zomatoQuote, swiggyQuote, toingQuote].map((q) => ({
      ...q,
      isProvisional: q.hasUnknownFees || q.priceProvenance === 'rule_estimated' || q.priceProvenance === 'unknown',
    }));

    // Find the cheapest platform based on finalPricePaise
    const sortedQuotes = [...quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
    const cheapestQuote = sortedQuotes[0];
    const highestQuote = sortedQuotes[sortedQuotes.length - 1];
    const maxSavingsPaise = Math.max(0, highestQuote.finalPricePaise - cheapestQuote.finalPricePaise);
    const isPriceTie = sortedQuotes.length > 1 && sortedQuotes[1].finalPricePaise === cheapestQuote.finalPricePaise;

    // Inspect all competing platforms: unknown fees, estimated prices, unknown prices, or unverified availability prevent definitive claim
    const hasUnresolvedCompetitor = quotes.some((q) => {
      if (q.platform === cheapestQuote.platform) return false;
      const isExplicitlyConfirmedUnavailable =
        q.isAvailable === false && (q as any).matchingStatus === 'not_available';
      if (isExplicitlyConfirmedUnavailable) return false;

      if (q.isAvailable === false || (q as any).matchingStatus === 'availability_not_verified') {
        return true;
      }
      if (q.hasUnknownFees) return true;
      if (q.priceProvenance === 'rule_estimated' || q.priceProvenance === 'unknown') return true;
      if (q.basePricePaise === null || q.basePricePaise === undefined) return true;
      return false;
    });

    const isDefinitiveCheapest =
      !cheapestQuote.hasUnknownFees &&
      cheapestQuote.priceProvenance !== 'rule_estimated' &&
      cheapestQuote.priceProvenance !== 'unknown' &&
      !isPriceTie &&
      !hasUnresolvedCompetitor;

    return {
      id: raw.id,
      name: raw.name,
      category: raw.category,
      cuisine: raw.cuisine,
      dietary: raw.dietary,
      description: raw.description,
      imageUrl: raw.imageUrl,
      restaurantId,
      restaurantName: raw.restaurantName,
      restaurantRating: raw.restaurantRating,
      ratingCount: raw.ratingCount,
      distanceKm: raw.distanceKm,
      city: raw.city || 'Bengaluru',
      isDemoData: raw.isDemoData !== false,
      dataProvenance: defaultProvenance,
      quotes,
      cheapestPlatform: cheapestQuote.platform,
      cheapestPricePaise: cheapestQuote.finalPricePaise,
      maxSavingsPaise,
      isDefinitiveCheapest,
      isPriceTie,
    };
  }

  /**
   * Helper to normalize and stem a word for tolerant matching
   * e.g. "momos" -> "momo", "pizzas" -> "pizza", "burgers" -> "burger"
   */
  private stemWord(word: string): string {
    const w = word.toLowerCase().trim();
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('es') && (w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes'))) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }

  /**
   * Dynamic search engine that queries the entire 50+ demo catalogue with scoring, partial matching and filters
   */
  public searchFood(filters: SearchFilters = {}): FoodItem[] {
    const {
      query,
      category,
      cuisine,
      dietary,
      maxBudgetPaise,
      platform,
      minRating,
      maxDistanceKm,
      sortBy = 'relevance',
      city,
    } = filters;

    let candidates = DEMO_FOOD_ITEMS;

    // 0. Location / City filter
    // If a city is explicitly requested, filter candidates to matching verified listings.
    // Bengaluru demo records are never falsely returned as Jaipur listings.
    // If city is omitted (undefined), do NOT silently default to Bengaluru.
    if (city && typeof city === 'string' && city.trim() !== '') {
      const requestedNormalized = normalizeCityName(city);
      candidates = candidates.filter((item) => {
        const itemCityNormalized = normalizeCityName(item.city || 'Bengaluru');
        return itemCityNormalized === requestedNormalized;
      });
    }

    // 1. Dietary filter (with query-level intent inference)
    let effectiveDietary: string | undefined = dietary && dietary.toLowerCase() !== 'all' ? dietary.toLowerCase() : undefined;

    if (!effectiveDietary && query && query.trim() !== '') {
      const qLower = query.toLowerCase();
      const hasVegIntent = /\b(vegan|pure veg|vegetarian)\b/i.test(qLower);
      const hasNonVegIntent = /\b(non-veg|non veg|nonveg|chicken|mutton|fish|meat|prawn|prawns|murgh)\b/i.test(qLower);

      if (hasVegIntent && hasNonVegIntent) {
        // Contradictory dietary terms: no genuine dish can be both vegan and meat
        return [];
      }

      // Check non-veg markers first so "non-veg" does not falsely match "veg"
      if (hasNonVegIntent) {
        effectiveDietary = 'non-veg';
      } else if (/\b(egg|anda)\b/i.test(qLower) && !/\b(veg|veggie)\b/i.test(qLower)) {
        effectiveDietary = 'egg';
      } else if (/\b(pure veg|vegetarian|veg)\b/i.test(qLower) && !/\bnon[-\s]?veg\b/i.test(qLower)) {
        effectiveDietary = 'veg';
      }
    }

    if (effectiveDietary) {
      candidates = candidates.filter((item) => {
        if (effectiveDietary === 'veg') return item.dietary === 'veg';
        if (effectiveDietary === 'non-veg') return item.dietary === 'non-veg';
        if (effectiveDietary === 'egg') return item.dietary === 'egg' || item.dietary === 'non-veg';
        return true;
      });
    }

    // 2. Category filter
    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase().trim();
      candidates = candidates.filter(
        (item) =>
          item.category.toLowerCase().includes(catLower) ||
          catLower.includes(item.category.toLowerCase())
      );
    }

    // 3. Cuisine filter
    if (cuisine && cuisine.toLowerCase() !== 'all') {
      const cuisLower = cuisine.toLowerCase().trim();
      candidates = candidates.filter((item) => item.cuisine.toLowerCase().includes(cuisLower));
    }

    // 4. Rating filter
    if (typeof minRating === 'number' && minRating > 0) {
      candidates = candidates.filter((item) => item.restaurantRating >= minRating);
    }

    // 5. Distance filter
    if (typeof maxDistanceKm === 'number' && maxDistanceKm > 0) {
      candidates = candidates.filter((item) => item.distanceKm <= maxDistanceKm);
    }

    // 6. Tokenized Search & Multi-field Scoring
    const MIN_RELEVANCE_SCORE = 25;
    type ScoredTemplate = { raw: RawFoodTemplate; score: number };
    let scoredList: ScoredTemplate[] = [];

    if (query && query.trim() !== '') {
      const rawTokens = query
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 0 && !STOP_WORDS.has(t));

      const stemmedTokens = rawTokens.map((t) => this.stemWord(t));
      const fullPhrase = query.toLowerCase().trim();
      const DIETARY_WORDS = new Set(['veg', 'veggie', 'vegetarian', 'pure', 'non-veg', 'nonveg', 'non', 'egg', 'anda']);
      const nonDietaryTokens = rawTokens.filter((t) => !DIETARY_WORDS.has(t));
      const formatNounsInQuery = rawTokens.filter((t) => DISH_FORMAT_NOUNS.has(t) || DISH_FORMAT_NOUNS.has(this.stemWord(t)));

      for (const item of candidates) {
        let score = 0;
        const nameWords = item.name.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
        const descWords = item.description.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
        const restWords = item.restaurantName.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
        const catWords = item.category.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
        const cuisWords = item.cuisine.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
        const tagsWords = item.tags.flatMap((t) => t.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean));

        // If query explicitly specifies a dish format noun (e.g. "pizza" in "chicken pizza", "burger" in "veg burger"),
        // the candidate MUST match at least one of the requested format nouns in name, tags, or category!
        if (formatNounsInQuery.length > 0) {
          let matchesFormatNoun = false;
          for (const fn of formatNounsInQuery) {
            const stemFn = this.stemWord(fn);
            if (
              tokenMatchesWords(nameWords, fn, stemFn) ||
              tokenMatchesWords(tagsWords, fn, stemFn) ||
              tokenMatchesWords(catWords, fn, stemFn)
            ) {
              matchesFormatNoun = true;
              break;
            }
          }
          if (!matchesFormatNoun) {
            continue;
          }
        }

        // For multi-token queries where non-dietary tokens exist, require candidate to match at least one core search token
        // e.g. "veg pizza" must not match a veggie burger
        if (nonDietaryTokens.length > 0) {
          let matchedAnyCore = false;
          for (let i = 0; i < rawTokens.length; i++) {
            const rawT = rawTokens[i];
            if (DIETARY_WORDS.has(rawT)) continue;
            const stemT = stemmedTokens[i];
            if (
              tokenMatchesWords(nameWords, rawT, stemT) ||
              tokenMatchesWords(tagsWords, rawT, stemT) ||
              tokenMatchesWords(catWords, rawT, stemT) ||
              tokenMatchesWords(cuisWords, rawT, stemT)
            ) {
              matchedAnyCore = true;
              break;
            }
          }
          if (!matchedAnyCore) {
            continue;
          }
        }

        const nameLower = item.name.toLowerCase();
        const tagsJoined = item.tags.map((t) => t.toLowerCase()).join(' ');

        // Exact phrase match bonus with word boundaries & food synonyms
        // Prevents false matches: "tea" matching "steamed", "ice" matching "rice"
        const phraseSynonyms = FOOD_SYNONYMS[fullPhrase] || [fullPhrase];
        let matchedPhrase = false;
        for (const p of phraseSynonyms) {
          if (phraseMatchesText(nameLower, p)) {
            score += 120;
            matchedPhrase = true;
            break;
          }
        }
        if (!matchedPhrase) {
          for (const p of phraseSynonyms) {
            if (phraseMatchesText(tagsJoined, p)) {
              score += 90;
              break;
            }
          }
        }

        // Token-by-token matching using word-boundary & synonym aware matcher
        let matchedTokenCount = 0;
        let matchedNameOrTagCount = 0;

        for (let i = 0; i < rawTokens.length; i++) {
          const rawT = rawTokens[i];
          const stemT = stemmedTokens[i];

          const inName = tokenMatchesWords(nameWords, rawT, stemT);
          const inTags = tokenMatchesWords(tagsWords, rawT, stemT);
          const inCategory = tokenMatchesWords(catWords, rawT, stemT);
          const inCuisine = tokenMatchesWords(cuisWords, rawT, stemT);
          const inRest = tokenMatchesWords(restWords, rawT, stemT);
          const inDesc = tokenMatchesWords(descWords, rawT, stemT);

          if (inName) {
            score += 60;
            matchedTokenCount++;
            matchedNameOrTagCount++;
          } else if (inTags) {
            score += 45;
            matchedTokenCount++;
            matchedNameOrTagCount++;
          } else if (inCategory || inCuisine) {
            score += 30;
            matchedTokenCount++;
          } else if (inRest) {
            score += 25;
            matchedTokenCount++;
          } else if (inDesc) {
            // Description-only match gets a low score and is only counted if name/tags also match or multi-token query
            score += 10;
            if (matchedNameOrTagCount > 0) {
              matchedTokenCount++;
            }
          }
        }

        // If user provided multiple search terms, boost items that matched ALL or MOST tokens
        if (rawTokens.length > 1 && matchedTokenCount === rawTokens.length) {
          score += 80; // Full conjunction bonus!
        }

        // Enforce minimum relevance threshold: single incidental description matches (score = 10) are excluded
        if (score >= MIN_RELEVANCE_SCORE) {
          scoredList.push({ raw: item, score });
        }
      }
    } else {
      // No search query provided -> all candidates match with baseline score
      scoredList = candidates.map((item) => ({ raw: item, score: 10 }));
    }

    // 7. Enrich into FoodItems with calculated platform quotes
    let foodItems = scoredList.map(({ raw, score }) => {
      const foodItem = this.buildFoodItem(raw);
      return { foodItem, score };
    });

    // 8. Budget filter (in integer paise)
    if (typeof maxBudgetPaise === 'number' && maxBudgetPaise > 0) {
      foodItems = foodItems.filter(({ foodItem }) => {
        if (platform && platform !== 'all') {
          const q = foodItem.quotes.find((quote) => quote.platform === platform);
          return q ? q.finalPricePaise <= maxBudgetPaise : false;
        }
        // General: at least one platform delivers within the user's budget
        const minQuote = Math.min(...foodItem.quotes.map((q) => q.finalPricePaise));
        return minQuote <= maxBudgetPaise;
      });
    }

    // 9. Sorting
    foodItems.sort((a, b) => {
      if (sortBy === 'cheapest') {
        const minA = a.foodItem.cheapestPricePaise ?? Infinity;
        const minB = b.foodItem.cheapestPricePaise ?? Infinity;
        return minA - minB;
      }
      if (sortBy === 'rating') {
        return b.foodItem.restaurantRating - a.foodItem.restaurantRating;
      }
      if (sortBy === 'fastest') {
        const timeA = Math.min(...a.foodItem.quotes.map((q) => (q.deliveryTimeMinutes && q.deliveryTimeMinutes > 0 ? q.deliveryTimeMinutes : 999)));
        const timeB = Math.min(...b.foodItem.quotes.map((q) => (q.deliveryTimeMinutes && q.deliveryTimeMinutes > 0 ? q.deliveryTimeMinutes : 999)));
        return timeA - timeB;
      }
      if (sortBy === 'distance') {
        return a.foodItem.distanceKm - b.foodItem.distanceKm;
      }
      // Default: relevance score descending, tie-broken by rating
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.foodItem.restaurantRating - a.foodItem.restaurantRating;
    });

    return foodItems.map((item) => item.foodItem);
  }

  /**
   * Run the full search pipeline from user intent
   */
  public executeSearchPipeline(intent: SearchIntent): FoodItem[] {
    const filters: SearchFilters = {
      query: intent.foodKeywords.join(' ') || intent.rawQuery,
      category: intent.category,
      cuisine: intent.cuisine,
      dietary: intent.dietary !== 'all' ? intent.dietary : undefined,
      maxBudgetPaise: intent.maxBudgetRupees ? intent.maxBudgetRupees * 100 : undefined,
      maxDistanceKm: intent.maxDistanceKm,
      minRating: intent.minRating,
      platform: intent.preferredPlatform,
      sortBy: intent.sortBy,
      city: intent.city,
    };

    let results = this.searchFood(filters);

    // If strict conjunction returned 0 results, relax query to find closest food matches
    if (results.length === 0 && intent.foodKeywords.length > 1) {
      // Try searching with the primary food noun (e.g. "pizza" from ["paneer", "pizza"])
      const primaryKeyword = intent.foodKeywords[intent.foodKeywords.length - 1];
      results = this.searchFood({ ...filters, query: primaryKeyword });
    }

    return results;
  }

  /**
   * Get detailed comparison for a specific item
   */
  public getComparison(
    itemId: string,
    coupons?: Record<PlatformType, string>,
    priceOverrides?: PriceOverrides,
    city?: string
  ): ComparisonResult | null {
    const raw = DEMO_FOOD_ITEMS.find((item) => item.id === itemId);
    if (!raw) return null;

    // Check location alignment between requested city and dish's verified city
    const requestedCityNormalized = city ? normalizeCityName(city) : '';
    const itemCityNormalized = normalizeCityName(raw.city || 'Bengaluru');
    const isCityMismatch = requestedCityNormalized !== '' && requestedCityNormalized !== itemCityNormalized;

    const foodItem = this.buildFoodItem(raw, coupons, priceOverrides);

    if (isCityMismatch) {
      // Mark all quotes as availability unverified for the mismatched city
      for (const q of foodItem.quotes) {
        q.isAvailable = false;
        q.unavailabilityReason = `No verified outlet found for ${raw.restaurantName} in ${city}. The available demo catalogue currently covers Bengaluru.`;
      }
      foodItem.isDefinitiveCheapest = false;
      const cheapestQuote = foodItem.quotes[0];
      const highestQuote = foodItem.quotes[foodItem.quotes.length - 1];
      const savingsPaise = 0;

      return {
        foodItem,
        cheapestQuote,
        highestQuote,
        savingsPaise,
        comparisonTimestamp: new Date().toISOString(),
        isDemoData: raw.isDemoData !== false,
        dataProvenance: resolveDataProvenance(raw),
        recommendationReason: `No verified listings are currently available for ${city}. The available demo catalogue currently covers Bengaluru. We do not invent unverified prices or delivery fees for ${city?.split(',')[0]}.`,
        isDefinitiveCheapest: false,
        isPriceTie: false,
        tiedPlatforms: [],
        isCityMismatch: true,
        locationMessage: `No verified outlet found for ${raw.restaurantName} in ${city}. The available demo catalogue currently covers Bengaluru.`,
      };
    }

    const sortedQuotes = [...foodItem.quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
    const cheapestQuote = sortedQuotes[0];
    const highestQuote = sortedQuotes[sortedQuotes.length - 1];
    const savingsPaise = Math.max(0, highestQuote.finalPricePaise - cheapestQuote.finalPricePaise);

    // Identify tied quotes at the lowest price
    const tiedQuotes = sortedQuotes.filter((q) => q.finalPricePaise === cheapestQuote.finalPricePaise);
    const isPriceTie = tiedQuotes.length > 1;
    const tiedPlatforms = tiedQuotes.map((q) => q.platform);

    // Inspect all competing platforms: unknown fees, estimated prices, unknown prices, or unverified availability prevent definitive claim
    const unresolvedCompetitors = foodItem.quotes
      .filter((q) => q.platform !== cheapestQuote.platform)
      .filter((q) => {
        const isExplicitlyConfirmedUnavailable =
          q.isAvailable === false && (q as any).matchingStatus === 'not_available';
        if (isExplicitlyConfirmedUnavailable) return false;

        if (q.isAvailable === false || (q as any).matchingStatus === 'availability_not_verified') {
          return true;
        }
        if (q.hasUnknownFees) return true;
        if (q.priceProvenance === 'rule_estimated' || q.priceProvenance === 'unknown') return true;
        if (q.basePricePaise === null || q.basePricePaise === undefined) return true;
        return false;
      });

    const hasUnresolvedCompetitor = unresolvedCompetitors.length > 0;

    const isDefinitiveCheapest =
      !cheapestQuote.hasUnknownFees &&
      cheapestQuote.priceProvenance !== 'rule_estimated' &&
      cheapestQuote.priceProvenance !== 'unknown' &&
      !isPriceTie &&
      !hasUnresolvedCompetitor;

    let reason = '';
    if (isPriceTie && !cheapestQuote.hasUnknownFees && cheapestQuote.priceProvenance !== 'rule_estimated' && !hasUnresolvedCompetitor) {
      const tiedNames = tiedQuotes.map((q) => q.platformDisplayName).join(' and ');
      reason = `Price Match (Tie): Both ${tiedNames} offer the identical verified lowest price of ₹${(cheapestQuote.finalPricePaise / 100).toFixed(2)}. Select your preferred platform or faster delivery time.`;
    } else if (isPriceTie) {
      const tiedNames = tiedQuotes.map((q) => q.platformDisplayName).join(' and ');
      reason = `Provisional Tie: ${tiedNames} share the lowest known subtotal of ₹${(cheapestQuote.finalPricePaise / 100).toFixed(2)}, but unverified checkout fees or estimated prices may alter final ranking.`;
    } else if (cheapestQuote.priceProvenance === 'rule_estimated') {
      reason = `Provisional Leader: ${cheapestQuote.platformDisplayName} is provisionally lowest at ₹${(cheapestQuote.finalPricePaise / 100).toFixed(2)} based on estimated pricing. Because this price is estimated rather than verified, this platform cannot be guaranteed as definitively cheapest.`;
    } else if (cheapestQuote.hasUnknownFees) {
      reason = `Provisional Leader: ${cheapestQuote.platformDisplayName} is provisionally lowest at ₹${(cheapestQuote.finalPricePaise / 100).toFixed(2)} based on known fees. However, because ${cheapestQuote.unknownFeeLabels.join(', ')} is unverified before merchant checkout, this platform cannot be guaranteed as definitively cheapest. Additional merchant fees may alter the final ranking.`;
    } else if (hasUnresolvedCompetitor) {
      const unresolvedNames = unresolvedCompetitors.map((q) => q.platformDisplayName).join(' and ');
      reason = `Provisional Leader: ${cheapestQuote.platformDisplayName} leads at ₹${(cheapestQuote.finalPricePaise / 100).toFixed(2)} based on available verified charges. However, competitor data for ${unresolvedNames} contains unverified fees, estimated prices, or unconfirmed availability, so this ranking remains provisional.`;
    } else {
      reason = `${cheapestQuote.platformDisplayName} is the confirmed cheapest choice. `;
      if (cheapestQuote.isUserEnteredPrice) {
        reason += `(Calculated using your entered price of ₹${(cheapestQuote.basePricePaise / 100).toFixed(2)}). `;
      }
      if (cheapestQuote.appliedCoupon) {
        reason += `You save additional with coupon code ${cheapestQuote.appliedCoupon.code}. `;
      }
      if (cheapestQuote.platformFeePaise === 0) {
        reason += `Zero platform fee confirmed. `;
      }
      if (savingsPaise > 0) {
        reason += `Total verified savings: ₹${(savingsPaise / 100).toFixed(2)} compared to ${highestQuote.platformDisplayName}.`;
      }
    }

    const resolvedProvenance = resolveDataProvenance(raw);

    return {
      foodItem,
      cheapestQuote,
      highestQuote,
      savingsPaise,
      comparisonTimestamp: new Date().toISOString(),
      isDemoData: raw.isDemoData !== false,
      dataProvenance: resolvedProvenance,
      recommendationReason: reason,
      isDefinitiveCheapest,
      isPriceTie,
      tiedPlatforms,
    };
  }

  /**
   * Get all coupons aggregated across all 3 platforms
   */
  public async getAllCoupons(): Promise<{ platform: PlatformType; coupons: CouponRule[] }[]> {
    const [zomato, swiggy, toing] = await Promise.all([
      this.zomatoAdapter.getAvailableCoupons(),
      this.swiggyAdapter.getAvailableCoupons(),
      this.toingAdapter.getAvailableCoupons(),
    ]);

    return [
      { platform: 'zomato', coupons: zomato },
      { platform: 'swiggy', coupons: swiggy },
      { platform: 'toing', coupons: toing },
    ];
  }
}
