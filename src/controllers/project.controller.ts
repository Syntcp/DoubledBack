import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import {
  clientIdParamSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  listProjectsQuerySchemaOwner,
  projectIdParamSchema,
  updateProjectSchema,
} from '../schemas/project.schema.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjectsByClient,
  listProjectsForOwner,
  updateProject,
} from '../services/project.services.js';

export async function listForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const { includeMeta } = listProjectsQuerySchema.parse(req.query);
  const out = await listProjectsByClient(req.user!.id, clientId, { includeMeta });
  res.json(out);
}

export async function createForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const input = createProjectSchema.parse(req.body);
  const out = await createProject(req.user!.id, clientId, input);
  res.status(201).json(out);
}

export async function getOne(req: AuthRequest, res: Response) {
  const { id } = projectIdParamSchema.parse(req.params);
  const { includeMeta } = listProjectsQuerySchema.parse(req.query);
  const out = await getProject(req.user!.id, id, { includeMeta });
  res.json(out);
}

export async function updateOne(req: AuthRequest, res: Response) {
  const { id } = projectIdParamSchema.parse(req.params);
  const input = updateProjectSchema.parse(req.body);
  const out = await updateProject(req.user!.id, id, input);
  res.json(out);
}

export async function remove(req: AuthRequest, res: Response) {
  const { id } = projectIdParamSchema.parse(req.params);
  await deleteProject(req.user!.id, id);
  res.status(204).send();
}

export async function listAllProjects(req: AuthRequest, res: Response) {
  const q = listProjectsQuerySchemaOwner.parse(req.query);
  const out = await listProjectsForOwner(req.user!.id, q as any);
  res.json(out);
}