import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import {
  entityLogsParamsSchema,
  listHttpLogsQuerySchema,
  listLogsQuerySchema,
  logIdParamSchema,
  requestIdParamSchema,
} from '../schemas/logs.schema.js';
import {
  getLog,
  listHttpLogs,
  listLogs,
  listLogsByEntity,
  listLogsByRequestId,
} from '../services/logs.services.js';

export async function listAll(req: AuthRequest, res: Response) {
  const q = listLogsQuerySchema.parse(req.query);
  const from = q.from ? new Date(q.from) : undefined;
  const to = q.to ? new Date(q.to) : undefined;
  const out = await listLogs({ ...q, from, to } as any);
  res.json(out);
}

export async function getOne(req: AuthRequest, res: Response) {
  const { id } = logIdParamSchema.parse(req.params);
  const row = await getLog(id);
  if (!row) return res.status(404).json({ error: 'NotFound' });
  res.json(row);
}

export async function byRequestId(req: AuthRequest, res: Response) {
  const { requestId } = requestIdParamSchema.parse(req.params);
  const q = listLogsQuerySchema.parse(req.query);
  const out = await listLogsByRequestId(requestId, { page: q.page, pageSize: q.pageSize });
  res.json(out);
}

export async function httpList(req: AuthRequest, res: Response) {
  const q = listHttpLogsQuerySchema.parse(req.query);
  const from = q.from ? new Date(q.from) : undefined;
  const to = q.to ? new Date(q.to) : undefined;
  const out = await listHttpLogs({ ...q, from, to } as any);
  res.json(out);
}

export async function byEntity(req: AuthRequest, res: Response) {
  const { entityType, entityId } = entityLogsParamsSchema.parse(req.params);
  const q = listLogsQuerySchema.parse(req.query);
  const out = await listLogsByEntity(entityType, entityId, { page: q.page, pageSize: q.pageSize });
  res.json(out);
}

