import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createForClient, getOne, listForClient, remove, updateOne, listAllProjects } from '../../controllers/project.controller.js';

const r = Router();

r.use(requireAuth);

// nested under clients
r.get('/clients/:clientId/projects', listForClient);
r.get('/projects', listAllProjects);
r.post('/clients/:clientId/projects', createForClient);

// direct project routes
r.get('/projects/:id', getOne);
r.patch('/projects/:id', updateOne);
r.delete('/projects/:id', remove);

export default r;

