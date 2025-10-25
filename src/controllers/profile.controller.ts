import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { upsertProfileSchema } from '../schemas/profile.schema.js';
import { getOwnerProfile, upsertOwnerProfile } from '../services/profile.services.js';

export async function getMine(req: AuthRequest, res: Response) {
  const p = await getOwnerProfile(req.user!.id);
  res.json(p ?? null);
}

export async function upsertMine(req: AuthRequest, res: Response) {
  const input = upsertProfileSchema.parse(req.body);
  const out = await upsertOwnerProfile(req.user!.id, input);
  res.json(out);
}

