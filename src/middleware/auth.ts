import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt.js';
import { env } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: { id: number };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = hdr.slice('Bearer '.length);
  try {
    const payload = await verifyJwt<{ sub: number }>(token, env.JWT_ACCESS_SECRET);
    req.user = { id: Number(payload.sub) };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
