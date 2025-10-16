import { SignJWT, jwtVerify } from 'jose';

const enc = new TextEncoder();

export async function signJwt(payload: Record<string, unknown>, secret: string, expiresIn: string) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(expiresIn)
    .sign(enc.encode(secret));
}

export async function verifyJwt<T = unknown>(token: string, secret: string) {
    const { payload } = await jwtVerify(token, enc.encode(secret));
    return payload as T; 
}