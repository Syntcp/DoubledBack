"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
require("express-async-errors");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const logger_js_1 = require("./lib/logger.js");
const request_logger_js_1 = require("./middleware/request-logger.js");
const index_js_1 = __importDefault(require("./routes/index.js"));
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.use((0, cors_1.default)({ origin: true, credentials: true }));
    // Attach a request id and basic logs (homemade instead of pino-http)
    app.use(request_logger_js_1.requestId);
    app.use(request_logger_js_1.requestLogger);
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: false, limit: '1mb' }));
    app.get('/health', (_req, res) => {
        res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
    });
    app.use('/api', index_js_1.default);
    app.use((_req, res) => res.status(404).json({ error: 'NotFound' }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err, req, res, _next) => {
        const status = err?.status || 500;
        const reqId = req.headers['x-request-id'] || res.getHeader('x-request-id') || '';
        const method = req.method;
        const url = req.originalUrl || req.url;
        logger_js_1.logger.error({ err, status, method, url, reqId }, 'Unhandled error');
        const isProd = process.env.NODE_ENV === 'production';
        const body = {
            error: err?.name || 'Error',
            message: isProd ? 'Server error' : err?.message,
        };
        if (reqId)
            body.requestId = reqId;
        if (!isProd && err?.stack)
            body.stack = String(err.stack);
        res.status(status).json(body);
    });
    return app;
}
