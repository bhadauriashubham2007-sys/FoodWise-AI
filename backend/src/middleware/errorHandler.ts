import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
  isCorsError?: boolean;
}

/**
 * Global Express Error-Handling Middleware
 * Strictly enforces:
 * 1. Consistent JSON error response format { success: false, error?: string, message: string }
 * 2. Zero leakage of stack traces, internal paths, SQL queries, or credentials to clients.
 * 3. Graceful handling of CORS rejections, body parsing errors, and uncaught exceptions.
 */
export function globalErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  // If headers have already been sent to client, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. CORS Policy Rejection (403 Forbidden)
  if (err?.isCorsError || err?.message?.includes('CORS policy rejection')) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: err.message || 'CORS policy rejection: Origin is not authorized.',
    });
  }

  // 2. Malformed JSON Body (400 Bad Request)
  if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Malformed JSON payload in request body.',
    });
  }

  // 3. Known Client-side Errors (4xx)
  const clientStatusCode =
    typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500
      ? err.statusCode
      : typeof err?.status === 'number' && err.status >= 400 && err.status < 500
      ? err.status
      : null;

  if (clientStatusCode) {
    return res.status(clientStatusCode).json({
      success: false,
      error: err.name || 'Client Error',
      message: err.message || 'The request could not be processed.',
    });
  }

  // 4. Server-side / Unhandled Errors (500 Internal Server Error)
  // Log safely on server console, NEVER leak stack traces or internal secrets to client
  console.error('[GlobalErrorHandler] Uncaught internal error:', err?.name || 'Error', err?.message || err);

  return res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected internal error occurred. Please try again later.',
  });
}
