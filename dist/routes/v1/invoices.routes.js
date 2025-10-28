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
r.get('/invoices', invoice_controller_js_1.listAll);
r.get('/invoices/summary', invoice_controller_js_1.summaryAll);
// Invoice-scoped
r.get('/invoices/:id(\\d+)', invoice_controller_js_1.getOne);
r.patch('/invoices/:id(\\d+)', invoice_controller_js_1.updateOne);
r.delete('/invoices/:id(\\d+)', invoice_controller_js_1.remove);
r.post('/invoices/:id(\\d+)/mark-sent', invoice_controller_js_1.markAsSent);
r.post('/invoices/:id(\\d+)/payments', invoice_controller_js_1.pay);
r.delete('/invoices/:id(\\d+)/payments/:paymentId', invoice_controller_js_1.unpay);
r.get('/invoices/:id(\\d+)/pdf', invoice_controller_js_1.downloadPdf);
exports.default = r;
