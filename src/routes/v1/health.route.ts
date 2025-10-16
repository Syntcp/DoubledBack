import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

const r = Router();

r.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

r.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (e) {
    res.status(503).json({ ready: false, reason: 'db_unreachable' });
  }
});

export default r;
