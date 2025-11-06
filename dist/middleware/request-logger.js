"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
exports.requestLogger = requestLogger;
const node_crypto_1 = require("node:crypto");
const logger_js_1 = require("../lib/logger.js");
const prisma_js_1 = require("../lib/prisma.js");
const audit_js_1 = require("../lib/audit.js");
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
    const url = req.originalUrl || req.url;
    const ip = req.ip || (req.socket && req.socket.remoteAddress);
    const ua = req.headers['user-agent'];
    const reasonHdr = req.headers['x-audit-reason'];
    if (typeof reasonHdr === 'string')
        res.locals = { ...res.locals, auditReason: reasonHdr };
    logger_js_1.logger.info({ id, method: req.method, url, ip, userAgent: ua }, 'Incoming request');
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1_000_000;
        const userId = req.user?.id;
        const auth = res.locals?.auth;
        const contentLength = res.getHeader('content-length');
        const base = {
            id,
            method: req.method,
            url,
            statusCode: res.statusCode,
            durationMs: Math.round(ms),
            userId,
            contentLength: typeof contentLength === 'string' ? Number(contentLength) : contentLength,
        };
        if (auth) {
            base.auth = auth;
        }
        // Use warn level for 4xx/5xx to stand out.
        if (res.statusCode >= 400) {
            logger_js_1.logger.warn(base, 'Request completed with error');
        }
        else {
            logger_js_1.logger.info(base, 'Request completed');
        }
        // Persist request log (fire-and-forget)
        const meta = {
            requestId: id,
            durationMs: Math.round(ms),
            statusCode: res.statusCode,
            method: req.method,
            url,
            query: (0, audit_js_1.redactSensitive)(req.query),
            params: (0, audit_js_1.redactSensitive)(req.params || {}),
            body: (0, audit_js_1.redactSensitive)(req.body),
            headers: (0, audit_js_1.redactSensitive)({
                ...req.headers,
                authorization: undefined,
                cookie: undefined,
            }),
            contentLength: typeof contentLength === 'string' ? Number(contentLength) : contentLength,
            auth,
            reason: res.locals?.auditReason ?? null,
        };
        void prisma_js_1.prisma.activityLog
            .create({
            data: {
                actorUserId: userId != null ? BigInt(userId) : null,
                entityType: 'http_request',
                entityId: null,
                action: 'request',
                ip: ip ?? null,
                userAgent: ua ?? null,
                metadata: meta,
            },
        })
            .catch(() => { });
    });
    next();
}
