import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt.js';
import { env } from '../config/env.js';
import { setUserId } from '../lib/als.js';

export interface AuthRequest extends Request {
  user?: { id: number };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) {
    // Enrich context for logger without leaking secrets
    res.locals.auth = {
      result: 'deny',
      reason: 'missing_bearer',
      hasAuthorizationHeader: Boolean(hdr),
      requestId: (req as any).id,
    };
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = hdr.slice('Bearer '.length);
  try {
    const payload = await verifyJwt<{ sub: number }>(token, env.JWT_ACCESS_SECRET);
    req.user = { id: Number(payload.sub) };
    // Set ALS userId for downstream hooks (e.g., Prisma write events)
    try { setUserId(req.user.id); } catch {}
    // Attach user context for downstream logging
    res.locals.auth = { result: 'allow', userId: req.user.id, requestId: (req as any).id };
    next();
  } catch (err: any) {
    // jose typically throws errors like JWTExpired, JWSInvalid, etc.
    res.locals.auth = {
      result: 'deny',
      reason: 'invalid_token',
      errorName: err?.name,
      errorCode: err?.code,
      expired: err?.name === 'JWTExpired' || err?.code === 'ERR_JWT_EXPIRED',
      requestId: (req as any).id,
    };
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
