import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signJwt } from '../lib/jwt.js';
import { sha256 } from '../lib/crypto.js';
import { env } from '../config/env.js';
import { randomUUID } from 'node:crypto';

export async function registerUser(input: { email: string; fullName: string; password: string }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw Object.assign(new Error('Email déjà utilisé'), { status: 409 });

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, fullName: input.fullName, passwordHash, isActive: true },
  });

  const tokens = await issueTokens(user.id);
  return { user: publicUser(user), ...tokens };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw Object.assign(new Error('Identifiants invalides'), { status: 401 });
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw Object.assign(new Error('Identifiants invalides'), { status: 401 });

  const tokens = await issueTokens(user.id);
  return { user: publicUser(user), ...tokens };
}

export async function refreshTokens(oldRefreshToken: string) {
  const hashed = sha256(oldRefreshToken);
  const db = await prisma.refreshToken.findUnique({ where: { tokenHash: hashed } });
  if (!db || db.revokedAt || db.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh invalide'), { status: 401 });
  }

  await prisma.refreshToken.update({
    where: { tokenHash: hashed },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(db.userId);
  return tokens;
}

export async function logout(refreshToken: string) {
  const hashed = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashed, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function publicUser(u: { id: bigint; email: string; fullName: string }) {
  return { id: Number(u.id), email: u.email, fullName: u.fullName };
}

async function issueTokens(userId: bigint | number) {
  const uid = typeof userId === 'bigint' ? Number(userId) : userId;
  const accessToken = await signJwt({ sub: uid }, env.JWT_ACCESS_SECRET, env.ACCESS_EXPIRES_IN);

  // refresh token aléatoire + stockage hashé
  const refreshRaw = randomUUID() + '.' + randomUUID();
  const tokenHash = sha256(refreshRaw);
  const expiresAt = new Date(Date.now() + parseMs(env.REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: { userId: BigInt(uid), tokenHash, expiresAt },
  });

  return { accessToken, refreshToken: refreshRaw, expiresIn: env.ACCESS_EXPIRES_IN };
}

// parse "15m"/"7d" -> ms
function parseMs(s: string) {
  const m = /^(\d+)([smhd])$/.exec(s);
  if (!m) throw new Error('Invalid duration: ' + s);
  const n = Number(m[1]);
  const unit = m[2];
  const map = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 } as const;
  return n * map[unit as keyof typeof map];
}
