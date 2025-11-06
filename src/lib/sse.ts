import type { Response } from 'express';
import { logger } from './logger.js';

const clients = new Map<number, Set<Response>>();

function write(res: Response, event: string, data?: unknown) {
  const payload = data === undefined ? '' : `data: ${JSON.stringify(data)}\n`;
  res.write(`event: ${event}\n${payload}\n`);
}

export function subscribe(userId: number, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Avoid reverse proxy buffering (nginx, etc.)
  res.setHeader('X-Accel-Buffering', 'no');

  try { res.flushHeaders?.(); } catch {}

  let set = clients.get(userId);
  if (!set) {
    set = new Set<Response>();
    clients.set(userId, set);
  }
  set.add(res);

  try { logger.info({ userId }, 'SSE subscribe'); } catch {}
  // Kick the stream and notify client
  res.write(`: connected ${Date.now()}\n\n`);
  setTimeout(() => {
    try {
      // Named event
      write(res, 'ready', { now: Date.now() });
      // Fallback default message event for some clients/tools
      res.write(`data: ${JSON.stringify({ type: 'ready', now: Date.now() })}\n\n`);
    } catch {}
  }, 50);
  const timer = setInterval(() => {
    try {
      // comment ping to keep proxies alive
      res.write(`: ping ${Date.now()}\n\n`);
      // explicit ping event for debugging/visibility
      write(res, 'ping', { now: Date.now() });
    } catch {}
  }, 25000);

  res.on('close', () => {
    clearInterval(timer);
    const s = clients.get(userId);
    if (s) {
      s.delete(res);
      if (s.size === 0) clients.delete(userId);
    }
  });
}

export function emitToUser(userId: number, event: string, data: unknown) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  try { logger.info({ userId, event, listeners: set.size }, 'SSE emit'); } catch {}
  for (const res of set) write(res, event, data);
}
