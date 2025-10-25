import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createForClient,
  downloadPdf,
  getOne,
  listForClient,
  markAsSent,
  pay,
  remove,
  summaryForClient,
  unpay,
  updateOne,
} from '../../controllers/invoice.controller.js';

const r = Router();

r.use(requireAuth);

// Client-scoped
r.get('/clients/:clientId/invoices', listForClient);
r.get('/clients/:clientId/invoices/summary', summaryForClient);
r.post('/clients/:clientId/invoices', createForClient);

// Invoice-scoped
r.get('/invoices/:id', getOne);
r.patch('/invoices/:id', updateOne);
r.delete('/invoices/:id', remove);
r.post('/invoices/:id/mark-sent', markAsSent);
r.post('/invoices/:id/payments', pay);
r.delete('/invoices/:id/payments/:paymentId', unpay);
r.get('/invoices/:id/pdf', downloadPdf);

export default r;

