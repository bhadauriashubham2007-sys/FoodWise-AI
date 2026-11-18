import { Router, Request, Response } from 'express';
import { BrandService } from '../services/brand.service.js';

const router = Router();
const brandService = new BrandService();

// GET /api/brands - List all brands with optional category and search filters
router.get('/', (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const q = req.query.q as string | undefined;

    const brands = brandService.getBrands(category, q);

    res.json({
      success: true,
      count: brands.length,
      isDemoData: true,
      data: brands,
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve food brands' });
  }
});

// GET /api/brands/:brandId - Get single brand details
router.get('/:brandId', (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const brand = brandService.getBrandById(brandId);

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    res.json({
      success: true,
      isDemoData: true,
      data: brand,
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve brand details' });
  }
});

// GET /api/brands/:brandId/menu - Get brand menu items
router.get('/:brandId/menu', (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;
    const category = req.query.category as string | undefined;
    const q = req.query.q as string | undefined;

    const brand = brandService.getBrandById(brandId);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const items = brandService.getBrandMenu(brandId, category, q);

    res.json({
      success: true,
      brand,
      count: items.length,
      isDemoData: true,
      data: items,
    });
  } catch (error) {
    console.error('Error fetching brand menu:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve brand menu' });
  }
});

// GET /api/brands/:brandId/items/:itemId/compare - Compare specific brand item across platforms
router.get('/:brandId/items/:itemId/compare', async (req: Request, res: Response) => {
  try {
    const { brandId, itemId } = req.params;
    const variant = req.query.variant as string | undefined;
    const rawCity = req.query.city as string | undefined;
    const city = typeof rawCity === 'string' && rawCity.trim() ? rawCity.trim() : '';
    const rawPincode = req.query.pincode as string | undefined;
    const pincode = typeof rawPincode === 'string' && rawPincode.trim() ? rawPincode.trim() : '';
    const distanceKm = req.query.distanceKm ? parseFloat(req.query.distanceKm as string) : 3.2;

    const comparison = await brandService.compareBrandItem(brandId, itemId, variant, {
      city,
      pincode,
      distanceKm: isNaN(distanceKm) ? 3.2 : distanceKm,
    });

    if (!comparison) {
      return res.status(404).json({ success: false, message: 'Brand item not found' });
    }

    res.json({
      success: true,
      isDemoData: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Error calculating brand comparison:', error);
    res.status(500).json({ success: false, message: 'Failed to compare brand item across platforms' });
  }
});

export default router;
