import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createForClient,
  downloadPdf,
  getOne,
  listAll,
  listForClient,
  markAsSent,
  pay,
  remove,
  summaryAll,
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

r.get('/invoices', listAll);
r.get('/invoices/summary', summaryAll);

// Invoice-scoped
r.get('/invoices/:id(\\d+)', getOne);
r.patch('/invoices/:id(\\d+)', updateOne);
r.delete('/invoices/:id(\\d+)', remove);
r.post('/invoices/:id(\\d+)/mark-sent', markAsSent);
r.post('/invoices/:id(\\d+)/payments', pay);
r.delete('/invoices/:id(\\d+)/payments/:paymentId', unpay);
r.get('/invoices/:id(\\d+)/pdf', downloadPdf);

export default r;

