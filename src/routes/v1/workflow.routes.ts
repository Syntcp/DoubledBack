import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  listTemplates,
  getProjectWorkflow,
  initProjectWorkflow,
  updateStep,
  updateContentItem,
} from '../../controllers/workflow.controller.js';

const r = Router();

r.use(requireAuth);

r.get('/workflow/templates', listTemplates);
r.get('/projects/:projectId(\\d+)/workflow', getProjectWorkflow);
r.post('/projects/:projectId(\\d+)/workflow/init', initProjectWorkflow);
r.patch('/workflow/steps/:stepId(\\d+)', updateStep);
r.patch('/workflow/content-items/:id(\\d+)', updateContentItem);

export default r;
