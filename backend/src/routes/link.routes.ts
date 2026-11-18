import { Router, Request, Response } from 'express';
import { LinkParserService } from '../services/linkParser.service.js';
import { ComparisonService } from '../services/comparison.service.js';

const router = Router();
const comparisonService = new ComparisonService();
const linkParserService = new LinkParserService(comparisonService);

// POST /api/compare-link - Compare food item by URL link from Zomato, Swiggy, or Toing
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, manualFoodName, manualPriceRupees, city } = req.body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid food URL link from Zomato, Swiggy, or Toing.',
      });
    }

    const priceNum =
      typeof manualPriceRupees === 'number'
        ? manualPriceRupees
        : manualPriceRupees
        ? parseFloat(manualPriceRupees)
        : undefined;

    const cityStr = typeof city === 'string' && city.trim() !== '' ? city.trim() : undefined;

    const result = await linkParserService.parseAndCompareLink(url, manualFoodName, priceNum, cityStr);

    return res.json(result);
  } catch (error) {
    console.error('Error in /api/compare-link:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while analyzing the link. Please try again.',
    });
  }
});

export default router;
