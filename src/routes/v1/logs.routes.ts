import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { byEntity, byRequestId, getOne, httpList, listAll } from '../../controllers/logs.controller.js';

const r = Router();

r.use(requireAuth);

// List all logs with optional filters
r.get('/logs', listAll);

// List logs by entity (generic)
r.get('/logs/entity/:entityType/:entityId', byEntity);

// List HTTP request logs with JSON-based filters (requestId/method/status/url)
r.get('/logs/http', httpList);

// List any logs that share the same metadata.requestId
r.get('/logs/by-request/:requestId', byRequestId);

// Get single log by id (keep after more specific prefixes)
r.get('/logs/:id', getOne);

export default r;
