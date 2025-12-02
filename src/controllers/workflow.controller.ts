import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import {
  projectIdParamSchema,
  workflowStepIdParamSchema,
  contentItemIdParamSchema,
  initProjectWorkflowSchema,
  updateWorkflowStepSchema,
  updateContentItemSchema,
} from '../schemas/workflow.schema.js';
import {
  listWorkflowTemplates,
  getProjectWorkflowForUser,
  initProjectWorkflowForUser,
  updateWorkflowStepForUser,
  updateContentItemForUser,
} from '../services/workflow.services.js';

export async function listTemplates(req: AuthRequest, res: Response) {
  const out = await listWorkflowTemplates();
  res.json(out);
}

export async function getProjectWorkflow(req: AuthRequest, res: Response) {
  const { projectId } = projectIdParamSchema.parse(req.params);
  const out = await getProjectWorkflowForUser(req.user!.id, projectId);
  if (!out) {
    res.status(404).json({ error: 'NotFound', message: 'Aucun workflow pour ce projet' });
    return;
  }
  res.json(out);
}

export async function initProjectWorkflow(req: AuthRequest, res: Response) {
  const { projectId } = projectIdParamSchema.parse(req.params);
  const body = initProjectWorkflowSchema.parse(req.body);
  const out = await initProjectWorkflowForUser(req.user!.id, projectId, body.templateId);
  res.status(201).json(out);
}

export async function updateStep(req: AuthRequest, res: Response) {
  const { stepId } = workflowStepIdParamSchema.parse(req.params);
  const body = updateWorkflowStepSchema.parse(req.body);
  const out = await updateWorkflowStepForUser(req.user!.id, stepId, body);
  res.json(out);
}

export async function updateContentItem(req: AuthRequest, res: Response) {
  const { id } = contentItemIdParamSchema.parse(req.params);
  const body = updateContentItemSchema.parse(req.body);
  const out = await updateContentItemForUser(req.user!.id, id, body);
  res.json(out);
}