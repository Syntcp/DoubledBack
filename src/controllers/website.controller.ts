import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import {
  clientIdParamSchema,
  createWebsiteSchema,
  listWebsitesQuerySchemaOwner,
  updateWebsiteSchema,
  websiteIdParamSchema,
} from '../schemas/website.schema.js';
import {
  createWebsite,
  deleteWebsite,
  getWebsite,
  listWebsitesByClient,
  listWebsitesForOwner,
  updateWebsite,
} from '../services/website.services.js';

export async function listForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const out = await listWebsitesByClient(req.user!.id, clientId);
  res.json(out);
}

export async function createForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const input = createWebsiteSchema.parse(req.body);
  const out = await createWebsite(req.user!.id, clientId, input);
  res.status(201).json(out);
}

export async function getOne(req: AuthRequest, res: Response) {
  const { id } = websiteIdParamSchema.parse(req.params);
  const out = await getWebsite(req.user!.id, id);
  res.json(out);
}

export async function updateOne(req: AuthRequest, res: Response) {
  const { id } = websiteIdParamSchema.parse(req.params);
  const input = updateWebsiteSchema.parse(req.body);
  const out = await updateWebsite(req.user!.id, id, input);
  res.json(out);
}

export async function remove(req: AuthRequest, res: Response) {
  const { id } = websiteIdParamSchema.parse(req.params);
  await deleteWebsite(req.user!.id, id);
  res.status(204).send();
}

export async function listAllWebsites(req: AuthRequest, res: Response) {
  const q = listWebsitesQuerySchemaOwner.parse(req.query);
  const out = await listWebsitesForOwner(req.user!.id, q as any);
  res.json(out);
}

