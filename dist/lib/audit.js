"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuditContext = buildAuditContext;
exports.redactSensitive = redactSensitive;
exports.auditLog = auditLog;
const prisma_js_1 = require("./prisma.js");
function buildAuditContext(req) {
    const id = req.id;
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || null;
    const userAgent = req.headers['user-agent'] || null;
    const reasonHdr = req.headers['x-audit-reason'];
    const reason = typeof reasonHdr === 'string' ? reasonHdr : null;
    return { requestId: id, ip, userAgent, reason };
}
function redactSensitive(value) {
    try {
        if (value == null)
            return value;
        if (Array.isArray(value))
            return value.map((v) => redactSensitive(v));
        if (typeof value === 'object') {
            const out = Array.isArray(value) ? [] : {};
            for (const [k, v] of Object.entries(value)) {
                const key = k.toLowerCase();
                if (key.includes('password') ||
                    key.includes('token') ||
                    key.includes('authorization') ||
                    key.includes('cookie') ||
                    key.includes('secret') ||
                    key.includes('hash')) {
                    out[k] = '[REDACTED]';
                }
                else {
                    out[k] = redactSensitive(v);
                }
            }
            return out;
        }
        return value;
    }
    catch {
        return value;
    }
}
/**
 * Write an ActivityLog record. Accepts an optional transaction client.
 */
async function auditLog(opts, tx) {
    const client = tx ?? prisma_js_1.prisma;
    const actor = opts.actorUserId == null ? null : BigInt(opts.actorUserId);
    const eid = opts.entityId == null ? null : BigInt(opts.entityId);
    await client.activityLog.create({
        data: {
            actorUserId: actor,
            entityType: opts.entityType,
            entityId: eid,
            action: opts.action,
            ip: opts.ip ?? null,
            userAgent: opts.userAgent ?? null,
            metadata: (opts.metadata ?? {}),
        },
    });
}
