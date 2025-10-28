import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { randomUUID } from 'node:crypto';
import { logger } from './lib/logger.js';
import { requestId, requestLogger } from './middleware/request-logger.js';
import api from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: true, credentials: true }));

  // Attach a request id and basic logs (homemade instead of pino-http)
  app.use(requestId);
  app.use(requestLogger);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
  });

  app.use('/api', api);

  app.use((_req, res) => res.status(404).json({ error: 'NotFound' }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status || 500;
    const reqId = (req.headers['x-request-id'] as string) || (res.getHeader('x-request-id') as string) || '';
    const method = req.method;
    const url = (req as any).originalUrl || req.url;

    logger.error({ err, status, method, url, reqId }, 'Unhandled error');

    const isProd = process.env.NODE_ENV === 'production';
    const body: any = {
      error: err?.name || 'Error',
      message: isProd ? 'Server error' : err?.message,
    };
    if (reqId) body.requestId = reqId;
    if (!isProd && err?.stack) body.stack = String(err.stack);

    res.status(status).json(body);
  });

  return app;
}
