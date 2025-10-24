import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { create, getOne, list, remove, updateOne } from '../../controllers/client.controller.js';

const r = Router();

r.use(requireAuth);

r.get('/clients', list);
r.get('/clients/:id', getOne);
r.post('/clients', create);
r.patch('/clients/:id', updateOne);
r.delete('/clients/:id', remove);

export default r;

