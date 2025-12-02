import { z } from 'zod';

export const projectIdParamSchema = z.object({
  projectId: z.coerce.number().int().positive(),
});

export const workflowStepIdParamSchema = z.object({
  stepId: z.coerce.number().int().positive(),
});

export const contentItemIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const initProjectWorkflowSchema = z.object({
  templateId: z.coerce.number().int().positive(),
});

export const updateWorkflowStepSchema = z.object({
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'])
    .optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  required: z.boolean().optional(),
  responsibleUserId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateContentItemSchema = z.object({
  status: z
    .enum(['REQUESTED', 'PARTIAL', 'RECEIVED', 'APPROVED'])
    .optional(),
  value: z.any().optional(),
  externalUrl: z.string().url().nullable().optional(),
  fileUrl: z.string().url().nullable().optional(),
  isBlocking: z.boolean().optional(),
});

export type InitProjectWorkflowInput = z.infer<typeof initProjectWorkflowSchema>;
export type UpdateWorkflowStepInput = z.infer<typeof updateWorkflowStepSchema>;
export type UpdateContentItemInput = z.infer<typeof updateContentItemSchema>;
