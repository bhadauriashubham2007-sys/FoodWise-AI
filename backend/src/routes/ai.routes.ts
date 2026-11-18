import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ComparisonService } from '../services/comparison.service.js';
import { IntentService } from '../services/intent.service.js';
import { AISearchResponse } from '../types/index.js';
import { aiQueryRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const comparisonService = new ComparisonService();
const intentService = new IntentService();

// POST /api/ai/query - End-to-end Dynamic Search Pipeline
// Sequence: User input -> Intent Extraction (Gemini/NLP) -> DB Search & Matching -> Price Calculation -> Coupon Eligibility -> Results
// Protected by 20 requests/minute per IP rate limiter
router.post('/query', aiQueryRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, dietary, budgetRupees, category, platform, sortBy, city } = req.body;

    const rawMessage = typeof message === 'string' ? message.trim() : '';
    let queryMessage = rawMessage;

    // Support empty text queries when browsing categories, dietary preferences or exploring the default catalogue
    if (!queryMessage) {
      if (category && category !== 'All') {
        queryMessage = `Popular ${category} dishes`;
      } else if (dietary && dietary !== 'all') {
        queryMessage = `Popular ${dietary} food deals`;
      } else {
        queryMessage = 'Popular multi-platform food deals';
      }
    }

    const requestedCity = typeof city === 'string' && city.trim() ? city.trim() : undefined;

    // Step 1: Extract Intent using Gemini AI (with resilient local NLP fallback)
    const { intent, source } = await intentService.extractIntent(queryMessage, {
      dietary: dietary !== 'all' ? dietary : undefined,
      maxBudgetRupees: typeof budgetRupees === 'number' && budgetRupees > 0 ? budgetRupees : undefined,
      category: category && category !== 'All' ? category : undefined,
      preferredPlatform: platform,
      sortBy,
      city: requestedCity,
    });

    // If user provided no search text but selected a category or dietary filter,
    // clear keyword filters so category browsing returns all matching dishes
    if (!rawMessage) {
      if (category && category !== 'All') {
        intent.category = category;
        intent.foodKeywords = [];
        intent.rawQuery = '';
      } else if (dietary && dietary !== 'all') {
        intent.dietary = dietary;
        intent.foodKeywords = [];
        intent.rawQuery = '';
      } else {
        intent.foodKeywords = [];
        intent.rawQuery = '';
      }
    }

    // Step 2 & 3: Search Database, Match Food & Calculate Prices via Adapters
    const matchedFoods = comparisonService.executeSearchPipeline(intent);

    // Step 4: Fetch applicable coupons
    const allCoupons = await comparisonService.getAllCoupons();

    // Step 5: Format Answer (Gemini AI advice or deterministic advice)
    let answerText = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (matchedFoods.length === 0) {
      const normalizedCity = requestedCity ? requestedCity.split(',')[0].trim().toLowerCase() : '';
      if (normalizedCity && normalizedCity !== 'bengaluru' && normalizedCity !== 'bangalore') {
        answerText = `No verified listings are currently available for ${requestedCity}. The available demo catalogue currently covers Bengaluru.\n\n` +
          `💡 **Tip**: Switch your location to Bengaluru in the top bar to explore the demo catalogue.`;
      } else {
        const queryLabel = message?.trim() || (category && category !== 'All' ? category : 'your criteria');
        answerText = `I couldn't find any food items in our catalogue matching "${queryLabel}".\n\n` +
          `💡 **Suggestions**:\n` +
          `• Try searching for popular categories like **Pizza**, **Biryani**, **Burgers**, **Momos**, **Cold Coffee**, or **Chaat**.\n` +
          `• If you set a budget (e.g. ₹${intent.maxBudgetRupees || budgetRupees}), try increasing it slightly or removing dietary constraints.`;
      }
    } else if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const promptContext = `
You are FoodWise AI, an expert food deal assistant comparing Zomato, Swiggy, and Toing.
The user asked: "${message}".

Extracted Intent:
- Food: ${intent.foodKeywords.join(', ')}
- Budget: ${intent.maxBudgetRupees ? `₹${intent.maxBudgetRupees}` : 'No limit'}
- Dietary: ${intent.dietary || 'Any'}
- Platform: ${intent.preferredPlatform || 'All'}

HERE ARE THE ACTUAL RETRIEVED DISHES FROM OUR DATABASE (DO NOT INVENT ANY DISHES OR PRICES):
${JSON.stringify(matchedFoods.slice(0, 4).map(f => ({
  name: f.name,
  restaurant: f.restaurantName,
  dietary: f.dietary,
  cheapestPlatform: f.cheapestPlatform,
  cheapestPriceRupees: ((f.cheapestPricePaise ?? Math.min(...f.quotes.map(q => q.finalPricePaise))) / 100).toFixed(2),
  maxSavingsRupees: (f.maxSavingsPaise ? f.maxSavingsPaise / 100 : 0).toFixed(2),
  quotes: f.quotes.map(q => ({
    platform: q.platformDisplayName,
    finalPriceRupees: (q.finalPricePaise / 100).toFixed(2),
    deliveryTimeMinutes: q.deliveryTimeMinutes,
    coupon: q.appliedCoupon?.code || 'None'
  }))
})), null, 2)}

Provide a concise, encouraging recommendation:
1. Highlight the best matching dish and the lowest price platform.
2. State the amount saved compared to other platforms.
3. Mention any eligible promo code.
4. Keep response under 4-5 bullet points.
`;

        const result = await model.generateContent(promptContext);
        answerText = result.response.text();
      } catch (geminiError: any) {
        console.warn('Gemini advice generation failed, using deterministic response:', geminiError?.message);
        answerText = buildDeterministicAnswer(message, intent, matchedFoods);
      }
    } else {
      answerText = buildDeterministicAnswer(message, intent, matchedFoods);
    }

    const responsePayload: AISearchResponse = {
      answer: answerText,
      intent,
      suggestedItems: matchedFoods,
      appliedFilters: {
        budgetPaise: intent.maxBudgetRupees ? intent.maxBudgetRupees * 100 : undefined,
        dietary: intent.dietary,
        cuisine: intent.cuisine,
        category: intent.category,
        platform: intent.preferredPlatform,
        sortBy: intent.sortBy,
      },
      matchedCoupons: allCoupons.flatMap(c => c.coupons).slice(0, 4),
    };

    return res.json({
      success: true,
      aiProvider: source === 'gemini-1.5-flash' ? 'gemini-1.5-flash' : 'foodwise-nlp-engine',
      data: responsePayload,
    });
  } catch (error) {
    console.error('Error in /api/ai/query:', error);
    next(error);
  }
});

function buildDeterministicAnswer(message: string, intent: any, matchedFoods: any[]): string {
  const topPick = matchedFoods[0];
  const sortedQuotes = [...topPick.quotes].sort((a: any, b: any) => a.finalPricePaise - b.finalPricePaise);
  const cheapest = sortedQuotes[0];
  const mostExpensive = sortedQuotes[sortedQuotes.length - 1];
  const savingsRupees = Math.max(0, (mostExpensive.finalPricePaise - cheapest.finalPricePaise) / 100).toFixed(0);

  const queryLabel = message?.trim() || intent?.category || (intent?.dietary && intent.dietary !== 'all' ? `${intent.dietary} dishes` : 'Popular food deals');
  let text = `Found **${matchedFoods.length} verified dishes** for "${queryLabel}":\n\n`;
  text += `✨ **Top Pick**: **${topPick.name}** from *${topPick.restaurantName}*\n`;
  text += `🏆 **Lowest Final Price**: **₹${(cheapest.finalPricePaise / 100).toFixed(2)}** on **${cheapest.platformDisplayName}** `;

  if (Number(savingsRupees) > 0) {
    text += `(Saves you approx. ₹${savingsRupees} vs ${mostExpensive.platformDisplayName})!\n`;
  } else {
    text += `\n`;
  }

  if (cheapest.appliedCoupon) {
    text += `🎟️ **Eligible Promo**: Use code \`${cheapest.appliedCoupon.code}\` at checkout.\n`;
  }
  if (cheapest.deliveryTimeMinutes && cheapest.deliveryTimeMinutes > 0) {
    text += `⏱️ **Est. Delivery**: ~${cheapest.deliveryTimeMinutes} minutes.\n\n`;
  }
  text += `*All prices calculated in exact integer paise including delivery, packaging, and taxes.*`;

  return text;
}

export default router;
