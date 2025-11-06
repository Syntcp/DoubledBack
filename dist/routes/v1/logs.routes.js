"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const logs_controller_js_1 = require("../../controllers/logs.controller.js");
const r = (0, express_1.Router)();
r.use(auth_js_1.requireAuth);
// List all logs with optional filters
r.get('/logs', logs_controller_js_1.listAll);
// List logs by entity (generic)
r.get('/logs/entity/:entityType/:entityId', logs_controller_js_1.byEntity);
// List HTTP request logs with JSON-based filters (requestId/method/status/url)
r.get('/logs/http', logs_controller_js_1.httpList);
// List any logs that share the same metadata.requestId
r.get('/logs/by-request/:requestId', logs_controller_js_1.byRequestId);
// Get single log by id (keep after more specific prefixes)
r.get('/logs/:id', logs_controller_js_1.getOne);
exports.default = r;
