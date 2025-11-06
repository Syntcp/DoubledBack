import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './lib/logger.js';
import { requestId, requestLogger } from './middleware/request-logger.js';
import api from './routes/index.js';
import { withRequestContext } from './lib/als.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  // Compression disabled for SSE and enabled for others
  app.use(
    compression({
      filter: (req, res) => {
        // Skip compression for Server-Sent Events
        const type = res.getHeader('Content-Type');
        if (type && String(type).includes('text/event-stream')) return false;
        if ((req as any).originalUrl?.includes('/api/v1/events')) return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.use(cors({ origin: true, credentials: true }));

  // Attach a request id and basic logs (homemade instead of pino-http)
  app.use(requestId);
  // Initialize AsyncLocalStorage request context
  app.use((req, _res, next) => {
    const url = (req as any).originalUrl || req.url;
    const id = (req as any).id as string | undefined;
    const method = req.method;
    withRequestContext({ requestId: id, method, url }, () => next());
  });
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

    // If headers already sent (e.g., SSE stream), don't attempt to write again
    if (res.headersSent) {
      try { return res.end(); } catch { return; }
    }
    const type = res.getHeader('Content-Type');
    if (type && String(type).includes('text/event-stream')) {
      try { return res.end(); } catch { return; }
    }
    res.status(status).json(body);
  });

  return app;
}
