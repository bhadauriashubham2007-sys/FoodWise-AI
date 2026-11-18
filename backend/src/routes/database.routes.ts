import { Router, Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/database.service.js';
import { isSupabaseConfigured, supabaseConfig, verifyAuthToken, AuthUser } from '../config/supabase.js';
import { SupabaseClient } from '@supabase/supabase-js';

const router = Router();
const dbService = new DatabaseService();

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  userClient?: SupabaseClient;
}

/**
 * Authentication and IDOR prevention middleware.
 * Must be mounted on route endpoints so Express has populated req.params.userId.
 *
 * 1. Validates Bearer token header presence and format (401 if missing/malformed).
 * 2. Authenticates token via verifyAuthToken (401 if invalid/expired).
 * 3. Asserts that req.params.userId matches authenticated user.id (403 if mismatched).
 * 4. Injects user and userClient onto Request for downstream handlers.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Missing Authorization header. Expected Bearer token.',
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Malformed Authorization header. Format must be: Bearer <token>',
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Empty Bearer token in Authorization header.',
    });
  }

  const { user, error, userClient } = await verifyAuthToken(token);

  if (error || !user || !userClient) {
    const isExpired = error?.message?.toLowerCase().includes('expired');
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'Authentication token has expired. Please sign in again.'
        : (error?.message || 'Invalid authentication token.'),
    });
  }

  // IDOR Protection: verify route parameter matches authenticated user ID
  const routeUserId = req.params.userId;
  if (routeUserId && routeUserId !== user.id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Authenticated user does not match requested user ID.',
    });
  }

  (req as AuthenticatedRequest).user = user;
  (req as AuthenticatedRequest).userClient = userClient;
  next();
}

/**
 * GET /api/database/health
 * Checks connection status to Supabase PostgreSQL database
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const status = await dbService.healthCheck();
    res.json({
      success: true,
      config: {
        isConfigured: supabaseConfig.isConfigured,
        isAdminConfigured: supabaseConfig.isAdminConfigured,
        mode: supabaseConfig.mode,
      },
      status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to run database health check',
      error: error.message,
    });
  }
});

/**
 * GET /api/database/platforms
 * Lists all active delivery platforms from Supabase or fallback
 */
router.get('/platforms', async (_req: Request, res: Response) => {
  try {
    const platforms = await dbService.getPlatforms();
    res.json({
      success: true,
      count: platforms.length,
      data: platforms,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve platforms',
      error: error.message,
    });
  }
});

/**
 * GET /api/database/deals/:userId
 * Retrieves saved deals for an authenticated user.
 * Protected: requires valid user JWT matching userId parameter.
 */
router.get('/deals/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userClient = (req as AuthenticatedRequest).userClient!;
    const deals = await dbService.getSavedDeals(userId, userClient);
    res.json({
      success: true,
      count: deals.length,
      data: deals,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve saved deals',
      error: error.message,
    });
  }
});

/**
 * POST /api/database/deals/:userId
 * Saves or updates a food deal bookmark.
 * Protected: requires valid user JWT matching userId parameter.
 */
router.post('/deals/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const dealInput = req.body;

    if (!dealInput.foodItemId || !dealInput.cheapestPlatformCode || dealInput.cheapestPricePaise === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: foodItemId, cheapestPlatformCode, cheapestPricePaise',
      });
    }

    const userClient = (req as AuthenticatedRequest).userClient!;
    const saved = await dbService.saveDeal(userId, dealInput, userClient);
    res.status(201).json({
      success: true,
      message: 'Deal saved successfully',
      data: saved,
    });
  } catch (error: any) {
    const isClientError =
      error.message?.includes('not found') ||
      error.message?.includes('missing') ||
      error.message?.includes('Missing') ||
      error.message?.includes('Invalid') ||
      error.message?.includes('Platform code') ||
      error.message?.includes('not registered in the database');
    const statusCode = isClientError ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to save deal',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/database/deals/:userId/:dealId
 * Deletes a saved deal bookmark.
 * Protected: requires valid user JWT matching userId parameter.
 */
router.delete('/deals/:userId/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, dealId } = req.params;
    const userClient = (req as AuthenticatedRequest).userClient!;
    const deleted = await dbService.deleteSavedDeal(userId, dealId, userClient);
    res.json({
      success: deleted,
      message: deleted ? 'Deal deleted successfully' : 'Deal not found or deletion failed',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete deal',
      error: error.message,
    });
  }
});

/**
 * GET /api/database/profile/:userId
 * Retrieves user profile preferences.
 * Protected: requires valid user JWT matching userId parameter.
 */
router.get('/profile/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userClient = (req as AuthenticatedRequest).userClient!;
    const profile = await dbService.getUserProfile(userId, userClient);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message,
    });
  }
});

/**
 * PUT /api/database/profile/:userId
 * Updates user profile preferences.
 * Protected: requires valid user JWT matching userId parameter.
 */
router.put('/profile/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const userClient = (req as AuthenticatedRequest).userClient!;
    const updated = await dbService.updateUserProfile(userId, updates, userClient);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
      error: error.message,
    });
  }
});

// Token lookup rate limiter: max 10 requests per minute per IP
const tokenRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkTokenRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = tokenRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    tokenRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * GET /api/database/share/:token
 * Public endpoint to view a shared price comparison.
 * Protected by 256-bit token entropy validation and IP rate limiting (10 req/min/IP).
 * Never exposes creator UUIDs, session IDs, or private user details.
 */
router.get('/share/:token', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkTokenRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Rate limit exceeded (maximum 10 requests per minute). Please try again later.',
    });
  }

  const { token } = req.params;
  const isValidHex64 = /^[a-f0-9]{64}$/i.test(token);

  if (!isValidHex64) {
    return res.status(400).json({
      success: false,
      message: 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).',
    });
  }

  try {
    const result = await dbService.getSharedComparison(token);
    if (!result || !result.comparison) {
      return res.status(404).json({
        success: false,
        message: 'Shared comparison not found or expired.',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shared comparison',
      error: error.message,
    });
  }
});

export default router;
