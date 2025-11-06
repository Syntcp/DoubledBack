import { Router } from 'express';
import { verifyJwt } from '../../lib/jwt.js';
import { env } from '../../config/env.js';
import { subscribe } from '../../lib/sse.js';
import { logger } from '../../lib/logger.js';

const r = Router();

// SSE endpoint: accepts either Authorization: Bearer ... or ?access_token=...
r.get('/events', (req, res) => {
  try { logger.info({ url: req.originalUrl }, 'SSE route hit'); } catch {}
  const q = req.query as { access_token?: string };
  const bearer = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = q.access_token || bearer;

  const deny = () => {
    if (res.headersSent) return; // already started (safety)
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unauthorized' }));
  };

  if (!token) { try { logger.warn('SSE missing token'); } catch {}; return deny(); }

  verifyJwt<{ sub: number }>(token, env.JWT_ACCESS_SECRET)
    .then((payload) => {
      const userId = Number(payload.sub);
      try { logger.info({ userId }, 'SSE verified'); } catch {}
      subscribe(userId, res);
      // keep connection open (do not call next / end)
    })
    .catch(() => deny());
});

export default r;
