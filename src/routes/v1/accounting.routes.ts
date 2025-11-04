import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { contributions, status, vat } from '../../controllers/accounting.controller.js';

const r = Router();

r.use(requireAuth);

r.get('/accounting/status', status);
r.get('/accounting/contributions', contributions);
r.get('/accounting/vat', vat);

export default r;

