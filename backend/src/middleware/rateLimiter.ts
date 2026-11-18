import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export interface RateLimiterMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  reset: () => void;
  getEntry: (ip: string) => { count: number; resetAt: number } | undefined;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * Zero external packages required.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiterMiddleware {
  const windowMs = options.windowMs ?? 60 * 1000; // 1 minute default
  const max = options.max ?? 20; // 20 requests default
  const message =
    options.message ??
    `Too many AI query requests from this IP. Rate limit is ${max} requests per minute. Please wait before trying again.`;

  const defaultKeyGen = (req: Request): string => {
    // Strictly rely on Express req.ip (derived from remote socket unless trust proxy is explicitly configured).
    // Never trust client-supplied X-Forwarded-For headers directly to prevent rate-limit spoofing bypass.
    return req.ip || req.socket.remoteAddress || 'unknown-client';
  };

  const keyGenerator = options.keyGenerator || defaultKeyGen;
  const clientMap = new Map<string, { count: number; resetAt: number }>();

  // Cleanup abandoned IPs periodically
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clientMap.entries()) {
      if (now > entry.resetAt) {
        clientMap.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));
  cleanupTimer.unref?.();

  const middleware: any = (req: Request, res: Response, next: NextFunction) => {
    const clientKey = keyGenerator(req);
    const now = Date.now();
    const entry = clientMap.get(clientKey);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      clientMap.set(clientKey, { count: 1, resetAt });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    entry.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
    return next();
  };

  middleware.reset = () => {
    clientMap.clear();
  };

  middleware.getEntry = (ip: string) => clientMap.get(ip);

  return middleware as RateLimiterMiddleware;
}

// Pre-configured AI Query Rate Limiter: 20 requests per minute
export const aiQueryRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many AI query requests from this IP. Rate limit is 20 requests per minute. Please try again shortly.',
});
