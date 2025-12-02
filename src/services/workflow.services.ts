import { prisma } from '../lib/prisma.js';

export type WorkflowStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
export type WorkflowStepStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type WorkflowStepKind = 'INTERNAL' | 'CLIENT_CONTENT';
export type ContentType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
export type ContentStatus = 'REQUESTED' | 'PARTIAL' | 'RECEIVED' | 'APPROVED';

export type WorkflowStepTemplatePublic = {
  id: number;
  templateId: number;
  title: string;
  description?: string | null;
  order: number;
  kind: WorkflowStepKind;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowTemplatePublic = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  steps: WorkflowStepTemplatePublic[];
};

export type ContentItemPublic = {
  id: number;
  stepId: number;
  label: string;
  type: ContentType;
  status: ContentStatus;
  isBlocking: boolean;
  requestedAt: Date;
  receivedAt?: Date | null;
  value?: unknown;
  externalUrl?: string | null;
  fileUrl?: string | null;
};

export type WorkflowStepPublic = {
  id: number;
  projectWorkflowId: number;
  templateStepId?: number | null;
  title: string;
  description?: string | null;
  order: number;
  kind: WorkflowStepKind;
  status: WorkflowStepStatus;
  required: boolean;
  dueDate?: Date | null;
  completedAt?: Date | null;
  responsibleUserId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  contentItems: ContentItemPublic[];
};

export type ProjectWorkflowPublic = {
  id: number;
  projectId: number;
  templateId?: number | null;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  steps: WorkflowStepPublic[];
};

function toId(v: any): number {
  return Number(typeof v === 'object' && v != null && 'toString' in v ? (v as any).toString() : v ?? 0);
}

function toContentItemPublic(c: any): ContentItemPublic {
  return {
    id: toId(c.id),
    stepId: toId(c.stepId),
    label: c.label,
    type: c.type,
    status: c.status,
    isBlocking: Boolean(c.isBlocking),
    requestedAt: c.requestedAt,
    receivedAt: c.receivedAt ?? null,
    value: c.value ?? undefined,
    externalUrl: c.externalUrl ?? null,
    fileUrl: c.fileUrl ?? null,
  };
}

function toWorkflowStepPublic(s: any): WorkflowStepPublic {
  return {
    id: toId(s.id),
    projectWorkflowId: toId(s.projectWorkflowId),
    templateStepId: s.templateStepId != null ? toId(s.templateStepId) : null,
    title: s.title,
    description: s.description ?? null,
    order: s.order,
    kind: s.kind,
    status: s.status,
    required: Boolean(s.required),
    dueDate: s.dueDate ?? null,
    completedAt: s.completedAt ?? null,
    responsibleUserId: s.responsibleUserId != null ? toId(s.responsibleUserId) : null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    contentItems: (s.contentItems ?? []).map(toContentItemPublic),
  };
}

function toWorkflowTemplatePublic(t: any): WorkflowTemplatePublic {
  return {
    id: toId(t.id),
    name: t.name,
    description: t.description ?? null,
    type: t.type ?? null,
    isActive: Boolean(t.isActive),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    steps: (t.steps ?? []).map((s: any) => ({
      id: toId(s.id),
      templateId: toId(s.templateId),
      title: s.title,
      description: s.description ?? null,
      order: s.order,
      kind: s.kind,
      required: Boolean(s.required),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  };
}

function toProjectWorkflowPublic(w: any): ProjectWorkflowPublic {
  const steps = (w.steps ?? []).slice().sort((a: any, b: any) => a.order - b.order);
  return {
    id: toId(w.id),
    projectId: toId(w.projectId),
    templateId: w.templateId != null ? toId(w.templateId) : null,
    status: w.status,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    steps: steps.map(toWorkflowStepPublic),
  };
}

async function assertProjectOwnership(userId: number, projectId: number) {
  const uid = BigInt(userId);
  const pid = BigInt(projectId);
  const project = await prisma.project.findFirst({
    where: {
      id: pid,
      client: {
        ownerId: uid,
      },
    },
    include: {
      client: true,
    },
  });
  if (!project) {
    throw Object.assign(new Error('Projet introuvable'), { status: 404 });
  }
  return project;
}

async function recomputeWorkflowStatus(projectWorkflowId: bigint) {
  const wf = await prisma.projectWorkflow.findUnique({
    where: { id: projectWorkflowId },
    include: { steps: true },
  });
  if (!wf) return;
  const steps = wf.steps || [];
  if (!steps.length) {
    await prisma.projectWorkflow.update({
      where: { id: projectWorkflowId },
      data: { status: 'NOT_STARTED' },
    });
    return;
  }
  const allDone = steps.every((s) => s.status === 'DONE');
  const anyStarted = steps.some((s) => s.status === 'IN_PROGRESS' || s.status === 'BLOCKED' || s.status === 'DONE');
  const status: WorkflowStatus = allDone ? 'DONE' : anyStarted ? 'IN_PROGRESS' : 'NOT_STARTED';
  await prisma.projectWorkflow.update({
    where: { id: projectWorkflowId },
    data: { status },
  });
}

export async function listWorkflowTemplates() {
  const templates = await prisma.workflowTemplate.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
  return templates.map(toWorkflowTemplatePublic);
}

export async function getProjectWorkflowForUser(userId: number, projectId: number): Promise<ProjectWorkflowPublic | null> {
  await assertProjectOwnership(userId, projectId);
  const pid = BigInt(projectId);
  const wf = await prisma.projectWorkflow.findUnique({
    where: { projectId: pid },
    include: {
      steps: {
        include: {
          contentItems: true,
        },
      },
    },
  });
  if (!wf) return null;
  return toProjectWorkflowPublic(wf);
}

export async function initProjectWorkflowForUser(userId: number, projectId: number, templateId: number): Promise<ProjectWorkflowPublic> {
  await assertProjectOwnership(userId, projectId);
  const pid = BigInt(projectId);
  const tid = BigInt(templateId);

  const existing = await prisma.projectWorkflow.findUnique({
    where: { projectId: pid },
    include: {
      steps: {
        include: { contentItems: true },
      },
    },
  });
  if (existing) {
    return toProjectWorkflowPublic(existing);
  }

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: tid, isActive: true },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
  if (!template) {
    throw Object.assign(new Error('Modèle de workflow introuvable'), { status: 404 });
  }

  const created = await prisma.projectWorkflow.create({
    data: {
      projectId: pid,
      templateId: tid,
      status: 'NOT_STARTED',
      steps: {
        create: template.steps.map((s) => ({
          templateStepId: s.id,
          title: s.title,
          description: s.description,
          order: s.order,
          kind: s.kind,
          required: s.required,
        })),
      },
    },
    include: {
      steps: {
        include: { contentItems: true },
      },
    },
  });

  return toProjectWorkflowPublic(created);
}

export async function updateWorkflowStepForUser(
  userId: number,
  stepId: number,
  input: {
    status?: WorkflowStepStatus;
    title?: string;
    description?: string;
    dueDate?: Date;
    required?: boolean;
    responsibleUserId?: number | null;
  },
): Promise<WorkflowStepPublic> {
  const uid = BigInt(userId);
  const sid = BigInt(stepId);
  const step = await prisma.workflowStep.findUnique({
    where: { id: sid },
    include: {
      projectWorkflow: {
        include: {
          project: {
            include: { client: true },
          },
        },
      },
      contentItems: true,
    },
  });
  if (!step || !step.projectWorkflow.project.client || step.projectWorkflow.project.client.ownerId !== uid) {
    throw Object.assign(new Error('Étape introuvable'), { status: 404 });
  }

  const data: any = {};
  if (input.status) data.status = input.status;
  if (typeof input.title === 'string') data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (typeof input.required === 'boolean') data.required = input.required;
  if (input.responsibleUserId !== undefined) {
    data.responsibleUserId = input.responsibleUserId === null ? null : BigInt(input.responsibleUserId);
  }

  const updated = await prisma.workflowStep.update({
    where: { id: sid },
    data,
    include: {
      contentItems: true,
    },
  });

  await recomputeWorkflowStatus(step.projectWorkflow.id);

  return toWorkflowStepPublic(updated);
}

export async function updateContentItemForUser(
  userId: number,
  contentItemId: number,
  input: {
    status?: ContentStatus;
    value?: unknown;
    externalUrl?: string | null;
    fileUrl?: string | null;
    isBlocking?: boolean;
  },
): Promise<ContentItemPublic> {
  const uid = BigInt(userId);
  const cid = BigInt(contentItemId);
  const item = await prisma.contentItem.findUnique({
    where: { id: cid },
    include: {
      step: {
        include: {
          projectWorkflow: {
            include: {
              project: {
                include: { client: true },
              },
            },
          },
        },
      },
    },
  });
  if (!item || !item.step.projectWorkflow.project.client || item.step.projectWorkflow.project.client.ownerId !== uid) {
    throw Object.assign(new Error('Contenu introuvable'), { status: 404 });
  }

  const data: any = {};
  if (input.status) data.status = input.status;
  if (input.value !== undefined) data.value = input.value;
  if (input.externalUrl !== undefined) data.externalUrl = input.externalUrl;
  if (input.fileUrl !== undefined) data.fileUrl = input.fileUrl;
  if (typeof input.isBlocking === 'boolean') data.isBlocking = input.isBlocking;
  if (input.status === 'RECEIVED' && !item.receivedAt) {
    data.receivedAt = new Date();
  }

  const updated = await prisma.contentItem.update({
    where: { id: cid },
    data,
  });

  return toContentItemPublic(updated);
}
