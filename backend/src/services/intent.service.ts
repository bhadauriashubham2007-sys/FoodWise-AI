import { GoogleGenerativeAI } from '@google/generative-ai';
import { SearchIntent, PlatformType, DietaryType } from '../types/index.js';

export class IntentService {
  /**
   * Extract user search intent using Gemini AI, with automatic resilient fallback
   */
  public async extractIntent(rawQuery: string, userOverrides?: Partial<SearchIntent>): Promise<{
    intent: SearchIntent;
    source: 'gemini-1.5-flash' | 'local-nlp-engine';
  }> {
    const trimmed = rawQuery.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const prompt = `
You are a search intent parser for an Indian food delivery price comparison app (Zomato, Swiggy, Toing).
User Query: "${trimmed}"

Extract search intent into this EXACT JSON structure:
{
  "foodKeywords": string[],      // main food search terms (e.g. ["paneer", "pizza"], ["cold", "coffee"], ["chicken", "biryani"], ["momos"])
  "category": string or null,    // one of: "Biryani & Rice", "Pizza & Italian", "Burgers & Fast Food", "Momos & Dumplings", "Chinese food", "South Indian food", "North Indian food", "Beverages", "Desserts", "Snacks" or null
  "cuisine": string or null,     // e.g. "Italian", "Mughlai", "North Indian", "South Indian", "American", "Tibetan", "Indo-Chinese", "Cafe", etc.
  "dietary": "veg" | "non-veg" | "egg" | "all" | null, // detect if user asked for veg, vegetarian, chicken, mutton, egg, etc.
  "maxBudgetRupees": number or null, // integer number extracted from "under 250", "below 100", "< 150", etc.
  "maxDistanceKm": number or null,   // if user asks for "near me", "nearby", default to 3.0, otherwise null
  "sortBy": "cheapest" | "rating" | "fastest" | "distance" | "relevance", // "cheapest" if "cheapest", "lowest price", "lowest delivery charge"; "fastest" if "quick"; "rating" if "best"
  "preferredPlatform": "zomato" | "swiggy" | "toing" | "all", // if user mentions specific platform
  "explanation": string         // a friendly 1-sentence explanation of what was extracted
}

CRITICAL RULES:
- Do NOT invent food items, prices, or restaurants.
- ONLY extract the user's intent.
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        const intent: SearchIntent = {
          foodKeywords: Array.isArray(parsed.foodKeywords) && parsed.foodKeywords.length > 0
            ? parsed.foodKeywords
            : this.extractKeywordsLocally(trimmed),
          rawQuery: trimmed,
          category: parsed.category || undefined,
          cuisine: parsed.cuisine || undefined,
          dietary: parsed.dietary || userOverrides?.dietary || undefined,
          maxBudgetRupees: typeof parsed.maxBudgetRupees === 'number'
            ? parsed.maxBudgetRupees
            : userOverrides?.maxBudgetRupees,
          maxDistanceKm: typeof parsed.maxDistanceKm === 'number' ? parsed.maxDistanceKm : undefined,
          minRating: userOverrides?.minRating,
          sortBy: parsed.sortBy || userOverrides?.sortBy || 'relevance',
          preferredPlatform: parsed.preferredPlatform || userOverrides?.preferredPlatform || 'all',
          city: userOverrides?.city,
          explanation: parsed.explanation || `Searching for ${parsed.foodKeywords?.join(' ') || trimmed}`,
        };

        return { intent, source: 'gemini-1.5-flash' };
      } catch (geminiError: any) {
        console.warn('Gemini intent extraction failed, switching to local NLP engine:', geminiError?.message);
      }
    }

    // High-performance Local Rule-Based NLP Intent Parser
    const intent = this.extractIntentLocally(trimmed, userOverrides);
    return { intent, source: 'local-nlp-engine' };
  }

  /**
   * Resilient local NLP parser that matches natural language food queries
   */
  public extractIntentLocally(query: string, userOverrides?: Partial<SearchIntent>): SearchIntent {
    const lower = query.toLowerCase();

    // 1. Extract Budget
    let maxBudgetRupees: number | undefined = userOverrides?.maxBudgetRupees;
    if (!maxBudgetRupees) {
      const budgetMatch = lower.match(/(?:under|below|less than|within|upto|up to|budget|max|₹|rs\.?)\s*(\d+)/i) ||
                          lower.match(/(\d+)\s*(?:rupees|rs|inr)/i);
      if (budgetMatch && budgetMatch[1]) {
        const val = parseInt(budgetMatch[1], 10);
        if (!isNaN(val) && val > 0 && val < 5000) {
          maxBudgetRupees = val;
        }
      }
    }

    // 2. Extract Dietary
    let dietary: DietaryType | 'all' | undefined = userOverrides?.dietary;
    if (!dietary || dietary === 'all') {
      if (/\b(non-veg|non veg|chicken|murgh|mutton|meat|fish|prawn|kebab|bbq chicken)\b/i.test(lower)) {
        dietary = 'non-veg';
      } else if (/\b(egg|anda)\b/i.test(lower)) {
        dietary = 'egg';
      } else if (/\b(veg|vegetarian|pure veg|paneer|dal|dosa|idli|samosa|mushroom|corn)\b/i.test(lower)) {
        dietary = 'veg';
      }
    }

    // 3. Extract Sorting Preference
    let sortBy: 'cheapest' | 'rating' | 'fastest' | 'distance' | 'relevance' = userOverrides?.sortBy || 'relevance';
    if (/\b(cheap|cheapest|lowest price|lowest delivery|budget|best deal|economical)\b/i.test(lower)) {
      sortBy = 'cheapest';
    } else if (/\b(fast|fastest|quick|quickest|speedy|earliest|30 mins)\b/i.test(lower)) {
      sortBy = 'fastest';
    } else if (/\b(top rated|best rated|highest rating|best quality|popular)\b/i.test(lower)) {
      sortBy = 'rating';
    } else if (/\b(near|nearby|nearest|around me|close|closest)\b/i.test(lower)) {
      sortBy = 'distance';
    }

    // 4. Extract Preferred Platform
    let preferredPlatform: PlatformType | 'all' = userOverrides?.preferredPlatform || 'all';
    if (/\b(zomato)\b/i.test(lower)) preferredPlatform = 'zomato';
    else if (/\b(swiggy)\b/i.test(lower)) preferredPlatform = 'swiggy';
    else if (/\b(toing)\b/i.test(lower)) preferredPlatform = 'toing';

    // 5. Extract Category
    let category: string | undefined = userOverrides?.category;
    if (!category) {
      if (/\b(biryani|pulao|rice|khichdi)\b/i.test(lower)) category = 'Biryani & Rice';
      else if (/\b(pizza|pasta|garlic bread)\b/i.test(lower)) category = 'Pizza & Italian';
      else if (/\b(burger|burgers|whopper|cheeseburger)\b/i.test(lower)) category = 'Burgers & Fast Food';
      else if (/\b(momo|momos|dimsum|dumpling|dumplings)\b/i.test(lower)) category = 'Momos & Dumplings';
      else if (/\b(noodle|noodles|manchurian|chowmein|fried rice|spring roll)\b/i.test(lower)) category = 'Chinese food';
      else if (/\b(dosa|idli|vada|uttapam|sambar)\b/i.test(lower)) category = 'South Indian food';
      else if (/\b(paneer butter|dal makhani|butter chicken|shahi paneer|thali|chole bhature|naan|roti)\b/i.test(lower)) category = 'North Indian food';
      else if (/\b(coffee|cold coffee|tea|chai|latte|shake|lassi|beverage|drink)\b/i.test(lower)) category = 'Beverages';
      else if (/\b(gulab jamun|brownie|cake|ice cream|sundae|rasmalai|churros|dessert|sweet)\b/i.test(lower)) category = 'Desserts';
      else if (/\b(samosa|chaat|pani puri|golgappe|roll|kathi roll|fries|snack)\b/i.test(lower)) category = 'Snacks';
    }

    // 6. Extract Distance
    let maxDistanceKm: number | undefined;
    if (/\b(near|nearby|nearest|around me|close)\b/i.test(lower)) {
      maxDistanceKm = 3.5;
    }

    // 7. Extract Clean Keywords
    const foodKeywords = this.extractKeywordsLocally(query);

    return {
      foodKeywords,
      rawQuery: query,
      category,
      dietary,
      maxBudgetRupees,
      maxDistanceKm,
      minRating: userOverrides?.minRating,
      sortBy,
      preferredPlatform,
      city: userOverrides?.city,
      explanation: `Parsed intent: searching for "${foodKeywords.join(' ')}" ${maxBudgetRupees ? `under ₹${maxBudgetRupees}` : ''} ${dietary ? `(${dietary})` : ''} sorted by ${sortBy}.`,
    };
  }

  /**
   * Cleans stop words and extracts pure food keywords
   */
  private extractKeywordsLocally(query: string): string[] {
    const stopWords = new Set([
      'find', 'me', 'the', 'a', 'an', 'for', 'with', 'in', 'at', 'on', 'of', 'and', 'or',
      'under', 'below', 'less', 'than', 'within', 'budget', 'rupees', 'rs', 'inr', 'near',
      'my', 'location', 'nearby', 'nearest', 'lowest', 'cheapest', 'best', 'top', 'rated',
      'charge', 'delivery', 'show', 'get', 'give', 'compare', 'across', 'all', 'platforms',
      'option', 'options', 'deal', 'deals', 'price', 'prices', 'food', 'dishes', 'dish',
      'order', 'ordering', 'want', 'please', 'can', 'you'
    ]);

    // Strip currency symbols and digits associated with budget
    const clean = query
      .toLowerCase()
      .replace(/[₹$]/g, ' ')
      .replace(/(?:under|below|less than|within|upto|up to|budget|max|rs\.?)\s*\d+/gi, ' ')
      .replace(/\b\d+\s*(?:rupees|rs|inr)\b/gi, ' ')
      .replace(/[^\w\s-]/g, ' ')
      .trim();

    const tokens = clean
      .split(/\s+/)
      .filter(t => t.length > 1 && !stopWords.has(t) && isNaN(Number(t)));

    return tokens.length > 0 ? tokens : [query.trim()];
  }
}
