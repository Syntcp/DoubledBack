import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp, { type Options as PinoHttpOptions, type ReqId } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { logger } from './lib/logger.js';
import api from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: true, credentials: true }));

  const httpLoggerOptions: PinoHttpOptions = {
    logger,
    genReqId(req, res): ReqId {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string' && header.length > 0) return header;
      const id = randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    }
  };

  app.use(pinoHttp(httpLoggerOptions));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
  });

  app.use('/api', api);

  app.use((_req, res) => res.status(404).json({ error: 'NotFound' }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message;
    res.status(status).json({ error: err.name || 'Error', message });
  });

  return app;
}
