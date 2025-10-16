import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const payload = {
    error: err.name || 'Error',
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  };
  if (status >= 500) logger.error({ err }, 'Unhandled error');
  res.status(status).json(payload);
}
