import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from './error';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const aiRateLimiter = (limit: number, windowMs: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = (req.user ? req.user.id : req.ip) || 'default-ip';
    const now = Date.now();
    const rateData = rateLimitMap.get(key);

    if (!rateData) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > rateData.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (rateData.count >= limit) {
      const retryAfter = Math.ceil((rateData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return next(
        new AppError(
          `Too many requests to AI Assistant. Please try again in ${retryAfter} seconds.`,
          429
        )
      );
    }

    rateData.count++;
    next();
  };
};
