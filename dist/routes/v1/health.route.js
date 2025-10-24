"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../../lib/prisma.js");
const r = (0, express_1.Router)();
r.get('/health', (_req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
});
r.get('/ready', async (_req, res) => {
    try {
        await prisma_js_1.prisma.$queryRaw `SELECT 1`;
        res.json({ ready: true });
    }
    catch (e) {
        res.status(503).json({ ready: false, reason: 'db_unreachable' });
    }
});
exports.default = r;
