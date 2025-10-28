import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpenseQuerySchema,
  expenseIdParamSchema,
  linkInvoiceSchema,
  financeSummaryQuery,
} from '../schemas/expense.schema.js';
import {
  listExpenses,
  createExpense,
  updateExpense,
  removeExpense,
  linkInvoiceToExpense,
  unlinkInvoiceFromExpense,
  financeSummary,
} from '../services/expense.services.js';

export async function listAll(req: AuthRequest, res: Response) {
  const q = listExpenseQuerySchema.parse(req.query);
  const out = await listExpenses(req.user!.id, q as any);
  res.json(out);
}

export async function createOne(req: AuthRequest, res: Response) {
  const input = createExpenseSchema.parse(req.body);
  const out = await createExpense(req.user!.id, input);
  res.status(201).json(out);
}

export async function updateOne(req: AuthRequest, res: Response) {
  const { id } = expenseIdParamSchema.parse(req.params);
  const input = updateExpenseSchema.parse(req.body);
  const out = await updateExpense(req.user!.id, id, input);
  res.json(out);
}

export async function removeOne(req: AuthRequest, res: Response) {
  const { id } = expenseIdParamSchema.parse(req.params);
  await removeExpense(req.user!.id, id);
  res.status(204).send();
}

export async function linkInvoice(req: AuthRequest, res: Response) {
  const { id } = expenseIdParamSchema.parse(req.params);
  const { invoiceId, allocated } = linkInvoiceSchema.parse(req.body);
  const out = await linkInvoiceToExpense(req.user!.id, id, invoiceId, allocated);
  res.json(out);
}

export async function unlinkInvoice(req: AuthRequest, res: Response) {
  const { id } = expenseIdParamSchema.parse(req.params);
  const invoiceId = Number(req.params.invoiceId);
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) throw Object.assign(new Error('invoiceId invalide'), { status: 400 });
  await unlinkInvoiceFromExpense(req.user!.id, id, invoiceId);
  res.status(204).send();
}

export async function summary(req: AuthRequest, res: Response) {
  const q = financeSummaryQuery.parse(req.query);
  const out = await financeSummary(req.user!.id, q as any);
  res.json(out);
}

