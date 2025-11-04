import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { buildAuditContext, auditLog } from '../lib/audit.js';
import {
  addPaymentSchema,
  clientIdParamSchema,
  createInvoiceSchema,
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from '../schemas/invoice.schema.js';
import {
  addPayment,
  createInvoice,
  deleteInvoice,
  generateInvoicePdf,
  getInvoice,
  listInvoicesByClient,
  markSent,
  removePayment,
  updateInvoice,
  clientInvoiceSummary,
  listInvoicesForOwner,
  allInvoiceSummary,
} from '../services/invoice.services.js';

export async function listAll(req: AuthRequest, res: Response) {
  const q = listInvoicesQuerySchema.parse(req.query);
  const out = await listInvoicesForOwner(req.user!.id, q as any);
  res.json(out);
}

export async function summaryAll(req: AuthRequest, res: Response) {
  const out = await allInvoiceSummary(req.user!.id);
  res.json(out);
}

export async function listForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const q = listInvoicesQuerySchema.parse(req.query);
  const out = await listInvoicesByClient(req.user!.id, clientId, q as any);
  res.json(out);
}

export async function createForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const input = createInvoiceSchema.parse(req.body);
  const audit = buildAuditContext(req);
  const out = await createInvoice(req.user!.id, clientId, input, audit);
  res.status(201).json(out);
}

export async function getOne(req: AuthRequest, res: Response) {
  const { id } = invoiceIdParamSchema.parse(req.params);
  const out = await getInvoice(req.user!.id, id);
  res.json(out);
}

export async function updateOne(req: AuthRequest, res: Response) {
  const { id } = invoiceIdParamSchema.parse(req.params);
  const input = updateInvoiceSchema.parse(req.body);
  const audit = buildAuditContext(req);
  const out = await updateInvoice(req.user!.id, id, input, audit);
  res.json(out);
}

export async function remove(req: AuthRequest, res: Response) {
  const { id } = invoiceIdParamSchema.parse(req.params);
  const audit = buildAuditContext(req);
  await deleteInvoice(req.user!.id, id, audit);
  res.status(204).send();
}

export async function pay(req: AuthRequest, res: Response) {
  const { id } = invoiceIdParamSchema.parse(req.params);
  const input = addPaymentSchema.parse(req.body);
  const audit = buildAuditContext(req);
  const out = await addPayment(req.user!.id, id, input, audit);
  res.json(out);
}

export async function unpay(req: AuthRequest, res: Response) {
  const { id, paymentId } = { id: Number(req.params.id), paymentId: Number(req.params.paymentId) };
  if (!Number.isFinite(paymentId) || paymentId <= 0) throw Object.assign(new Error('paymentId invalide'), { status: 400 });
  const audit = buildAuditContext(req);
  await removePayment(req.user!.id, id, paymentId, audit);
  res.status(204).send();
}

export async function markAsSent(req: AuthRequest, res: Response) {
  const { id } = invoiceIdParamSchema.parse(req.params);
  const audit = buildAuditContext(req);
  const out = await markSent(req.user!.id, id, audit);
  res.json(out);
}

export async function downloadPdf(req: AuthRequest, res: Response, next: Function) {
  try {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const buf = await generateInvoicePdf(req.user!.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.send(buf);
    // Audit: PDF download
    const audit = buildAuditContext(req);
    await auditLog({
      actorUserId: req.user!.id,
      entityType: 'invoice',
      entityId: id,
      action: 'pdf_download',
      ip: audit.ip ?? null,
      userAgent: audit.userAgent ?? null,
      metadata: { requestId: audit.requestId, reason: audit.reason ?? null },
    });
  } catch (e: any) {
    logger.error({ err: e, reqId: req.headers['x-request-id'] }, 'generateInvoicePdf failed');
    next(e);
  }
}

export async function summaryForClient(req: AuthRequest, res: Response) {
  const { clientId } = clientIdParamSchema.parse(req.params);
  const out = await clientInvoiceSummary(req.user!.id, clientId);
  res.json(out);
}
