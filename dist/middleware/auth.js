"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_js_1 = require("../lib/jwt.js");
const env_js_1 = require("../config/env.js");
async function requireAuth(req, res, next) {
    const hdr = req.headers.authorization;
    if (!hdr?.startsWith('Bearer ')) {
        // Enrich context for logger without leaking secrets
        res.locals.auth = {
            result: 'deny',
            reason: 'missing_bearer',
            hasAuthorizationHeader: Boolean(hdr),
            requestId: req.id,
        };
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = hdr.slice('Bearer '.length);
    try {
        const payload = await (0, jwt_js_1.verifyJwt)(token, env_js_1.env.JWT_ACCESS_SECRET);
        req.user = { id: Number(payload.sub) };
        // Attach user context for downstream logging
        res.locals.auth = { result: 'allow', userId: req.user.id, requestId: req.id };
        next();
    }
    catch (err) {
        // jose typically throws errors like JWTExpired, JWSInvalid, etc.
        res.locals.auth = {
            result: 'deny',
            reason: 'invalid_token',
            errorName: err?.name,
            errorCode: err?.code,
            expired: err?.name === 'JWTExpired' || err?.code === 'ERR_JWT_EXPIRED',
            requestId: req.id,
        };
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
