import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { createClientSchema, updateClientSchema, clientIdParamSchema, listClientsQuerySchema } from '../schemas/client.schema.js';
import { createClient, deleteClient, getClient, listClients, updateClient } from '../services/client.services.js';
import { listProjectsByClient } from '../services/project.services.js';
import { clientInvoiceSummary } from '../services/invoice.services.js';

export async function list(req: AuthRequest, res: Response) {
  const q = listClientsQuerySchema.parse(req.query);
  const out = await listClients(req.user!.id, q);
  res.json(out);
}

export async function getOne(req: AuthRequest, res: Response) {
  const { id } = clientIdParamSchema.parse(req.params);
  const client = await getClient(req.user!.id, id);
  const [projects, invoices] = await Promise.all([
    listProjectsByClient(req.user!.id, id, { includeMeta: true }),
    clientInvoiceSummary(req.user!.id, id),
  ]);
  res.json({ ...client, projects, invoices });
}

export async function create(req: AuthRequest, res: Response) {
  const input = createClientSchema.parse(req.body);
  const out = await createClient(req.user!.id, input);
  res.status(201).json(out);
}

export async function updateOne(req: AuthRequest, res: Response) {
  const { id } = clientIdParamSchema.parse(req.params);
  const input = updateClientSchema.parse(req.body);
  const out = await updateClient(req.user!.id, id, input);
  res.json(out);
}

export async function remove(req: AuthRequest, res: Response) {
  const { id } = clientIdParamSchema.parse(req.params);
  await deleteClient(req.user!.id, id);
  res.status(204).send();
}
