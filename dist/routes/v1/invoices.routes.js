"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const invoice_controller_js_1 = require("../../controllers/invoice.controller.js");
const r = (0, express_1.Router)();
r.use(auth_js_1.requireAuth);
// Client-scoped
r.get('/clients/:clientId/invoices', invoice_controller_js_1.listForClient);
r.get('/clients/:clientId/invoices/summary', invoice_controller_js_1.summaryForClient);
r.post('/clients/:clientId/invoices', invoice_controller_js_1.createForClient);
// Invoice-scoped
r.get('/invoices/:id', invoice_controller_js_1.getOne);
r.patch('/invoices/:id', invoice_controller_js_1.updateOne);
r.delete('/invoices/:id', invoice_controller_js_1.remove);
r.post('/invoices/:id/mark-sent', invoice_controller_js_1.markAsSent);
r.post('/invoices/:id/payments', invoice_controller_js_1.pay);
r.delete('/invoices/:id/payments/:paymentId', invoice_controller_js_1.unpay);
r.get('/invoices/:id/pdf', invoice_controller_js_1.downloadPdf);
exports.default = r;
