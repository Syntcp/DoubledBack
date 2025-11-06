"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAll = listAll;
exports.getOne = getOne;
exports.byRequestId = byRequestId;
exports.httpList = httpList;
exports.byEntity = byEntity;
const logs_schema_js_1 = require("../schemas/logs.schema.js");
const logs_services_js_1 = require("../services/logs.services.js");
async function listAll(req, res) {
    const q = logs_schema_js_1.listLogsQuerySchema.parse(req.query);
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    const out = await (0, logs_services_js_1.listLogs)({ ...q, from, to });
    res.json(out);
}
async function getOne(req, res) {
    const { id } = logs_schema_js_1.logIdParamSchema.parse(req.params);
    const row = await (0, logs_services_js_1.getLog)(id);
    if (!row)
        return res.status(404).json({ error: 'NotFound' });
    res.json(row);
}
async function byRequestId(req, res) {
    const { requestId } = logs_schema_js_1.requestIdParamSchema.parse(req.params);
    const q = logs_schema_js_1.listLogsQuerySchema.parse(req.query);
    const out = await (0, logs_services_js_1.listLogsByRequestId)(requestId, { page: q.page, pageSize: q.pageSize });
    res.json(out);
}
async function httpList(req, res) {
    const q = logs_schema_js_1.listHttpLogsQuerySchema.parse(req.query);
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    const out = await (0, logs_services_js_1.listHttpLogs)({ ...q, from, to });
    res.json(out);
}
async function byEntity(req, res) {
    const { entityType, entityId } = logs_schema_js_1.entityLogsParamsSchema.parse(req.params);
    const q = logs_schema_js_1.listLogsQuerySchema.parse(req.query);
    const out = await (0, logs_services_js_1.listLogsByEntity)(entityType, entityId, { page: q.page, pageSize: q.pageSize });
    res.json(out);
}
