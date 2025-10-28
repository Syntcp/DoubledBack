"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshTokens = refreshTokens;
exports.logout = logout;
const prisma_js_1 = require("../lib/prisma.js");
const password_js_1 = require("../lib/password.js");
const jwt_js_1 = require("../lib/jwt.js");
const crypto_js_1 = require("../lib/crypto.js");
const env_js_1 = require("../config/env.js");
const node_crypto_1 = require("node:crypto");
async function registerUser(input) {
    const exists = await prisma_js_1.prisma.user.findUnique({ where: { email: input.email } });
    if (exists)
        throw Object.assign(new Error('Email déjà utilisé'), { status: 409 });
    const passwordHash = await (0, password_js_1.hashPassword)(input.password);
    const user = await prisma_js_1.prisma.user.create({
        data: { email: input.email, fullName: input.fullName, passwordHash, isActive: true },
    });
    const tokens = await issueTokens(user.id);
    return { user: publicUser(user), ...tokens };
}
async function loginUser(input) {
    const user = await prisma_js_1.prisma.user.findUnique({ where: { email: input.email } });
    if (!user)
        throw Object.assign(new Error('Identifiants invalides'), { status: 401 });
    const ok = await (0, password_js_1.verifyPassword)(user.passwordHash, input.password);
    if (!ok)
        throw Object.assign(new Error('Identifiants invalides'), { status: 401 });
    const tokens = await issueTokens(user.id);
    return { user: publicUser(user), ...tokens };
}
async function refreshTokens(oldRefreshToken) {
    const hashed = (0, crypto_js_1.sha256)(oldRefreshToken);
    const db = await prisma_js_1.prisma.refreshToken.findUnique({ where: { tokenHash: hashed } });
    if (!db || db.revokedAt || db.expiresAt < new Date()) {
        throw Object.assign(new Error('Refresh invalide'), { status: 401 });
    }
    await prisma_js_1.prisma.refreshToken.update({
        where: { tokenHash: hashed },
        data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(db.userId);
    return tokens;
}
async function logout(refreshToken) {
    const hashed = (0, crypto_js_1.sha256)(refreshToken);
    await prisma_js_1.prisma.refreshToken.updateMany({
        where: { tokenHash: hashed, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
function publicUser(u) {
    return { id: Number(u.id), email: u.email, fullName: u.fullName };
}
async function issueTokens(userId) {
    const uid = typeof userId === 'bigint' ? Number(userId) : userId;
    const accessToken = await (0, jwt_js_1.signJwt)({ sub: uid }, env_js_1.env.JWT_ACCESS_SECRET, env_js_1.env.ACCESS_EXPIRES_IN);
    // refresh token aléatoire + stockage hashé
    const refreshRaw = (0, node_crypto_1.randomUUID)() + '.' + (0, node_crypto_1.randomUUID)();
    const tokenHash = (0, crypto_js_1.sha256)(refreshRaw);
    const expiresAt = new Date(Date.now() + parseMs(env_js_1.env.REFRESH_EXPIRES_IN));
    await prisma_js_1.prisma.refreshToken.create({
        data: { userId: BigInt(uid), tokenHash, expiresAt },
    });
    return { accessToken, refreshToken: refreshRaw, expiresIn: env_js_1.env.ACCESS_EXPIRES_IN };
}
// parse "15m"/"7d" -> ms
function parseMs(s) {
    const m = /^(\d+)([smhd])$/.exec(s);
    if (!m)
        throw new Error('Invalid duration: ' + s);
    const n = Number(m[1]);
    const unit = m[2];
    const map = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 };
    return n * map[unit];
}
