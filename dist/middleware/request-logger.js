"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
exports.requestLogger = requestLogger;
const node_crypto_1 = require("node:crypto");
const logger_js_1 = require("../lib/logger.js");
function requestId(req, res, next) {
    const header = req.headers['x-request-id'];
    const id = typeof header === 'string' && header.length > 0 ? header : (0, node_crypto_1.randomUUID)();
    res.setHeader('x-request-id', id);
    req.id = id;
    next();
}
function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();
    const id = req.id;
    logger_js_1.logger.info({ id, method: req.method, url: req.originalUrl || req.url }, 'Incoming request');
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1_000_000;
        logger_js_1.logger.info({ id, statusCode: res.statusCode, durationMs: Math.round(ms) }, 'Request completed');
    });
    next();
}
