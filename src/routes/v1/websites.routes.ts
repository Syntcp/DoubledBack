import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createForClient, getOne, listAllWebsites, listForClient, remove, updateOne } from '../../controllers/website.controller.js';

const r = Router();

r.use(requireAuth);

// nested under clients
r.get('/clients/:clientId/websites', listForClient);
r.post('/clients/:clientId/websites', createForClient);

// global listing and direct website routes
r.get('/websites', listAllWebsites);
r.get('/websites/:id', getOne);
r.patch('/websites/:id', updateOne);
r.delete('/websites/:id', remove);

export default r;

