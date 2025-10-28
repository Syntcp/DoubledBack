"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAll = listAll;
exports.summaryAll = summaryAll;
exports.listForClient = listForClient;
exports.createForClient = createForClient;
exports.getOne = getOne;
exports.updateOne = updateOne;
exports.remove = remove;
exports.pay = pay;
exports.unpay = unpay;
exports.markAsSent = markAsSent;
exports.downloadPdf = downloadPdf;
exports.summaryForClient = summaryForClient;
const logger_js_1 = require("../lib/logger.js");
const invoice_schema_js_1 = require("../schemas/invoice.schema.js");
const invoice_services_js_1 = require("../services/invoice.services.js");
async function listAll(req, res) {
    const q = invoice_schema_js_1.listInvoicesQuerySchema.parse(req.query);
    const out = await (0, invoice_services_js_1.listInvoicesForOwner)(req.user.id, q);
    res.json(out);
}
async function summaryAll(req, res) {
    const out = await (0, invoice_services_js_1.allInvoiceSummary)(req.user.id);
    res.json(out);
}
async function listForClient(req, res) {
    const { clientId } = invoice_schema_js_1.clientIdParamSchema.parse(req.params);
    const q = invoice_schema_js_1.listInvoicesQuerySchema.parse(req.query);
    const out = await (0, invoice_services_js_1.listInvoicesByClient)(req.user.id, clientId, q);
    res.json(out);
}
async function createForClient(req, res) {
    const { clientId } = invoice_schema_js_1.clientIdParamSchema.parse(req.params);
    const input = invoice_schema_js_1.createInvoiceSchema.parse(req.body);
    const out = await (0, invoice_services_js_1.createInvoice)(req.user.id, clientId, input);
    res.status(201).json(out);
}
async function getOne(req, res) {
    const { id } = invoice_schema_js_1.invoiceIdParamSchema.parse(req.params);
    const out = await (0, invoice_services_js_1.getInvoice)(req.user.id, id);
    res.json(out);
}
async function updateOne(req, res) {
    const { id } = invoice_schema_js_1.invoiceIdParamSchema.parse(req.params);
    const input = invoice_schema_js_1.updateInvoiceSchema.parse(req.body);
    const out = await (0, invoice_services_js_1.updateInvoice)(req.user.id, id, input);
    res.json(out);
}
async function remove(req, res) {
    const { id } = invoice_schema_js_1.invoiceIdParamSchema.parse(req.params);
    await (0, invoice_services_js_1.deleteInvoice)(req.user.id, id);
    res.status(204).send();
}
async function pay(req, res) {
    const { id } = invoice_schema_js_1.invoiceIdParamSchema.parse(req.params);
    const input = invoice_schema_js_1.addPaymentSchema.parse(req.body);
    const out = await (0, invoice_services_js_1.addPayment)(req.user.id, id, input);
    res.json(out);
}
async function unpay(req, res) {
    const { id, paymentId } = { id: Number(req.params.id), paymentId: Number(req.params.paymentId) };
    if (!Number.isFinite(paymentId) || paymentId <= 0)
        throw Object.assign(new Error('paymentId invalide'), { status: 400 });
    await (0, invoice_services_js_1.removePayment)(req.user.id, id, paymentId);
    res.status(204).send();
}
async function markAsSent(req, res) {
    const { id } = invoice_schema_js_1.invoiceIdParamSchema.parse(req.params);
    const out = await (0, invoice_services_js_1.markSent)(req.user.id, id);
    res.json(out);
}
async function downloadPdf(req, res, next) {
    try {
        const { id } = invoice_schema_js_1.invoiceIdParamSchema.parse(req.params);
        const buf = await (0, invoice_services_js_1.generateInvoicePdf)(req.user.id, id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
        res.send(buf);
    }
    catch (e) {
        logger_js_1.logger.error({ err: e, reqId: req.headers['x-request-id'] }, 'generateInvoicePdf failed');
        next(e);
    }
}
async function summaryForClient(req, res) {
    const { clientId } = invoice_schema_js_1.clientIdParamSchema.parse(req.params);
    const out = await (0, invoice_services_js_1.clientInvoiceSummary)(req.user.id, clientId);
    res.json(out);
}
