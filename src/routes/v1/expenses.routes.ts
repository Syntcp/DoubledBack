import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createOne,
  listAll,
  updateOne,
  removeOne,
  linkInvoice,
  unlinkInvoice,
  summary,
} from '../../controllers/expense.controller.js';

const r = Router();

r.use(requireAuth);

// Expenses CRUD
r.get('/expenses', listAll);
r.post('/expenses', createOne);
r.patch('/expenses/:id(\\d+)', updateOne);
r.delete('/expenses/:id(\\d+)', removeOne);

// Linking to client invoices
r.post('/expenses/:id(\\d+)/link-invoice', linkInvoice);
r.delete('/expenses/:id(\\d+)/links/:invoiceId(\\d+)', unlinkInvoice);

// Finance summary
r.get('/finance/summary', summary);

export default r;

