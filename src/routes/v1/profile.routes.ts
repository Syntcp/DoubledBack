import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getMine, upsertMine } from '../../controllers/profile.controller.js';

const r = Router();

r.use(requireAuth);
r.get('/profile', getMine);
r.put('/profile', upsertMine);

export default r;

