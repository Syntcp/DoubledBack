"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getOne = getOne;
exports.create = create;
exports.updateOne = updateOne;
exports.remove = remove;
const client_schema_js_1 = require("../schemas/client.schema.js");
const client_services_js_1 = require("../services/client.services.js");
const project_services_js_1 = require("../services/project.services.js");
const invoice_services_js_1 = require("../services/invoice.services.js");
async function list(req, res) {
    const q = client_schema_js_1.listClientsQuerySchema.parse(req.query);
    const out = await (0, client_services_js_1.listClients)(req.user.id, q);
    res.json(out);
}
async function getOne(req, res) {
    const { id } = client_schema_js_1.clientIdParamSchema.parse(req.params);
    const client = await (0, client_services_js_1.getClient)(req.user.id, id);
    const [projects, invoices] = await Promise.all([
        (0, project_services_js_1.listProjectsByClient)(req.user.id, id, { includeMeta: true }),
        (0, invoice_services_js_1.clientInvoiceSummary)(req.user.id, id),
    ]);
    res.json({ ...client, projects, invoices });
}
async function create(req, res) {
    const input = client_schema_js_1.createClientSchema.parse(req.body);
    const out = await (0, client_services_js_1.createClient)(req.user.id, input);
    res.status(201).json(out);
}
async function updateOne(req, res) {
    const { id } = client_schema_js_1.clientIdParamSchema.parse(req.params);
    const input = client_schema_js_1.updateClientSchema.parse(req.body);
    const out = await (0, client_services_js_1.updateClient)(req.user.id, id, input);
    res.json(out);
}
async function remove(req, res) {
    const { id } = client_schema_js_1.clientIdParamSchema.parse(req.params);
    await (0, client_services_js_1.deleteClient)(req.user.id, id);
    res.status(204).send();
}
