"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_js_1 = require("../lib/jwt.js");
const env_js_1 = require("../config/env.js");
async function requireAuth(req, res, next) {
    const hdr = req.headers.authorization;
    if (!hdr?.startsWith('Bearer '))
        return res.status(401).json({ error: 'Unauthorized' });
    const token = hdr.slice('Bearer '.length);
    try {
        const payload = await (0, jwt_js_1.verifyJwt)(token, env_js_1.env.JWT_ACCESS_SECRET);
        req.user = { id: Number(payload.sub) };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
