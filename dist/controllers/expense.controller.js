"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAll = listAll;
exports.createOne = createOne;
exports.updateOne = updateOne;
exports.removeOne = removeOne;
exports.linkInvoice = linkInvoice;
exports.unlinkInvoice = unlinkInvoice;
exports.summary = summary;
const expense_schema_js_1 = require("../schemas/expense.schema.js");
const expense_services_js_1 = require("../services/expense.services.js");
async function listAll(req, res) {
    const q = expense_schema_js_1.listExpenseQuerySchema.parse(req.query);
    const out = await (0, expense_services_js_1.listExpenses)(req.user.id, q);
    res.json(out);
}
async function createOne(req, res) {
    const input = expense_schema_js_1.createExpenseSchema.parse(req.body);
    const out = await (0, expense_services_js_1.createExpense)(req.user.id, input);
    res.status(201).json(out);
}
async function updateOne(req, res) {
    const { id } = expense_schema_js_1.expenseIdParamSchema.parse(req.params);
    const input = expense_schema_js_1.updateExpenseSchema.parse(req.body);
    const out = await (0, expense_services_js_1.updateExpense)(req.user.id, id, input);
    res.json(out);
}
async function removeOne(req, res) {
    const { id } = expense_schema_js_1.expenseIdParamSchema.parse(req.params);
    await (0, expense_services_js_1.removeExpense)(req.user.id, id);
    res.status(204).send();
}
async function linkInvoice(req, res) {
    const { id } = expense_schema_js_1.expenseIdParamSchema.parse(req.params);
    const { invoiceId, allocated } = expense_schema_js_1.linkInvoiceSchema.parse(req.body);
    const out = await (0, expense_services_js_1.linkInvoiceToExpense)(req.user.id, id, invoiceId, allocated);
    res.json(out);
}
async function unlinkInvoice(req, res) {
    const { id } = expense_schema_js_1.expenseIdParamSchema.parse(req.params);
    const invoiceId = Number(req.params.invoiceId);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0)
        throw Object.assign(new Error('invoiceId invalide'), { status: 400 });
    await (0, expense_services_js_1.unlinkInvoiceFromExpense)(req.user.id, id, invoiceId);
    res.status(204).send();
}
async function summary(req, res) {
    const q = expense_schema_js_1.financeSummaryQuery.parse(req.query);
    const out = await (0, expense_services_js_1.financeSummary)(req.user.id, q);
    res.json(out);
}
