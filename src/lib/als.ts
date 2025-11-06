import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId?: string;
  userId?: number;
  method?: string;
  url?: string;
};

const als = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

export function setUserId(userId: number) {
  const ctx = als.getStore();
  if (ctx) ctx.userId = userId;
}

