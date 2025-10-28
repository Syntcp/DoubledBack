"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const expense_controller_js_1 = require("../../controllers/expense.controller.js");
const r = (0, express_1.Router)();
r.use(auth_js_1.requireAuth);
// Expenses CRUD
r.get('/expenses', expense_controller_js_1.listAll);
r.post('/expenses', expense_controller_js_1.createOne);
r.patch('/expenses/:id(\\d+)', expense_controller_js_1.updateOne);
r.delete('/expenses/:id(\\d+)', expense_controller_js_1.removeOne);
// Linking to client invoices
r.post('/expenses/:id(\\d+)/link-invoice', expense_controller_js_1.linkInvoice);
r.delete('/expenses/:id(\\d+)/links/:invoiceId(\\d+)', expense_controller_js_1.unlinkInvoice);
// Finance summary
r.get('/finance/summary', expense_controller_js_1.summary);
exports.default = r;
