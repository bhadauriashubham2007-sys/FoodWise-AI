import cors, { CorsOptions } from 'cors';

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

/**
 * Build the set of allowed origins combining defaults and environment configurations.
 * In production (NODE_ENV === 'production'), localhost development origins are strictly excluded.
 * Only explicitly configured FRONTEND_URL, ALLOWED_ORIGINS, or runtime extraOrigins are allowed.
 */
export function getAllowedOrigins(extraOrigins?: string[], forceNodeEnv?: string): Set<string> {
  const nodeEnv = forceNodeEnv !== undefined ? forceNodeEnv : (process.env.NODE_ENV || 'development');
  const isProduction = nodeEnv.toLowerCase() === 'production';

  const envFrontend = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
  const envAllowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

  // Localhost development origins are included ONLY when NOT in production
  const devOrigins = isProduction ? [] : DEFAULT_ALLOWED_ORIGINS;

  const rawList = [
    ...devOrigins,
    ...envFrontend,
    ...envAllowed,
    ...(extraOrigins || []),
  ];

  const cleaned = rawList
    .filter((o): o is string => Boolean(o && typeof o === 'string' && o.trim() !== ''))
    .map((o) => o.trim().replace(/\/$/, ''));

  return new Set(cleaned);
}

/**
 * Configure CORS options with strict whitelist checking.
 * - In development: permits localhost origins plus any configured origins.
 * - In production: rejects localhost origins and requires explicitly configured origins.
 * - Fails safely closed if production origins are missing.
 */
export function getCorsOptions(extraOrigins?: string[], forceNodeEnv?: string): CorsOptions {
  const allowedSet = getAllowedOrigins(extraOrigins, forceNodeEnv);

  return {
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. curl, mobile native apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalized = origin.trim().replace(/\/$/, '');
      if (allowedSet.has(normalized)) {
        return callback(null, true);
      }

      const corsError = new Error(`CORS policy rejection: Origin ${origin} is not authorized.`);
      (corsError as any).statusCode = 403;
      (corsError as any).isCorsError = true;
      return callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    maxAge: 86400, // 24 hours preflight cache
  };
}

export function createCorsMiddleware(extraOrigins?: string[], forceNodeEnv?: string) {
  return cors(getCorsOptions(extraOrigins, forceNodeEnv));
}
