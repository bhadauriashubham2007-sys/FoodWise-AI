import { Router, Request, Response } from 'express';
import { ComparisonService } from '../services/comparison.service.js';

const router = Router();
const comparisonService = new ComparisonService();

// GET /api/coupons - List all available platform coupons
router.get('/', async (_req: Request, res: Response) => {
  try {
    const couponGroups = await comparisonService.getAllCoupons();
    res.json({
      success: true,
      isDemoData: true,
      data: couponGroups,
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve coupons' });
  }
});

export default router;
