import type { Request, Response } from 'express';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema.js';
import { loginUser, registerUser, refreshTokens, logout } from '../services/auth.services.js';
 
export async function register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    res.json(result);
}

export async function refresh(req: Request, res: Response) {
  const input = refreshSchema.parse(req.body);
  const result = await refreshTokens(input.refreshToken);
  res.json(result);
}

export async function logoutController(req: Request, res: Response) {
  const input = refreshSchema.parse(req.body);
  await logout(input.refreshToken);
  res.status(204).send();
}