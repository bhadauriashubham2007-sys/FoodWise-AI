import { Router, Request, Response } from 'express';
import { ComparisonService } from '../services/comparison.service.js';
import { SearchFilters, PlatformType } from '../types/index.js';

const router = Router();
const comparisonService = new ComparisonService();

// GET /api/foods - Search & filter food items across entire 50+ catalogue
router.get('/', (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;
    const cuisine = req.query.cuisine as string | undefined;
    const dietary = req.query.dietary as string | undefined;
    const maxBudget = req.query.maxBudget ? parseFloat(req.query.maxBudget as string) : undefined;
    const platform = req.query.platform as PlatformType | 'all' | undefined;
    const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
    const sortBy = req.query.sortBy as any;
    const rawCity = req.query.city as string | undefined;
    const city = typeof rawCity === 'string' && rawCity.trim() ? rawCity.trim() : undefined;

    const filters: SearchFilters = {
      query: q,
      category,
      cuisine,
      dietary,
      maxBudgetPaise: maxBudget && !isNaN(maxBudget) ? Math.round(maxBudget * 100) : undefined,
      platform,
      minRating: minRating && !isNaN(minRating) ? minRating : undefined,
      sortBy: ['cheapest', 'rating', 'fastest', 'distance', 'relevance'].includes(sortBy) ? sortBy : 'relevance',
      city,
    };

    const items = comparisonService.searchFood(filters);

    let message: string | undefined = undefined;
    if (city) {
      const normalized = city.split(',')[0].trim().toLowerCase();
      if (normalized !== 'bengaluru' && normalized !== 'bangalore' && items.length === 0) {
        message = `No verified listings are currently available for ${city}. The available demo catalogue currently covers Bengaluru.`;
      }
    }

    res.json({
      success: true,
      count: items.length,
      isDemoData: true,
      appliedFilters: filters,
      message,
      data: items,
    });
  } catch (error) {
    console.error('Error in /api/foods:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve food items' });
  }
});

// GET /api/foods/:id/compare - Compare prices across Zomato, Swiggy, Toing for an item
router.get('/:id/compare', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zomatoCoupon = req.query.zomatoCoupon as string | undefined;
    const swiggyCoupon = req.query.swiggyCoupon as string | undefined;
    const toingCoupon = req.query.toingCoupon as string | undefined;
    const rawCity = req.query.city as string | undefined;
    const city = typeof rawCity === 'string' && rawCity.trim() ? rawCity.trim() : undefined;

    const couponPreferences = {
      zomato: zomatoCoupon || '',
      swiggy: swiggyCoupon || '',
      toing: toingCoupon || '',
    };

    const comparison = comparisonService.getComparison(id, couponPreferences, undefined, city);

    if (!comparison) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const requestedCityNormalized = city ? city.split(',')[0].trim().toLowerCase() : '';
    const isCityMismatch =
      requestedCityNormalized !== '' &&
      requestedCityNormalized !== 'bengaluru' &&
      requestedCityNormalized !== 'bangalore';

    res.json({
      success: true,
      isCityMismatch,
      message: isCityMismatch
        ? `No verified listings are currently available for ${city}. The available demo catalogue currently covers Bengaluru.`
        : undefined,
      data: comparison,
    });
  } catch (error) {
    console.error('Error in /api/foods/:id/compare:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate comparison' });
  }
});

export default router;
