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
const pino_http_1 = __importDefault(require("pino-http"));
const node_crypto_1 = require("node:crypto");
const logger_js_1 = require("./lib/logger.js");
const index_js_1 = __importDefault(require("./routes/index.js"));
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.use((0, cors_1.default)({ origin: true, credentials: true }));
    const httpLoggerOptions = {
        logger: logger_js_1.logger,
        genReqId(req, res) {
            const header = req.headers['x-request-id'];
            if (typeof header === 'string' && header.length > 0)
                return header;
            const id = (0, node_crypto_1.randomUUID)();
            res.setHeader('x-request-id', id);
            return id;
        }
    };
    app.use((0, pino_http_1.default)(httpLoggerOptions));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: false, limit: '1mb' }));
    app.get('/health', (_req, res) => {
        res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
    });
    app.use('/api', index_js_1.default);
    app.use((_req, res) => res.status(404).json({ error: 'NotFound' }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err, _req, res, _next) => {
        const status = err.status || 500;
        const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message;
        res.status(status).json({ error: err.name || 'Error', message });
    });
    return app;
}
