// @ts-nocheck
import { prisma } from '../lib/prisma.js';
import { auditLog, redactSensitive } from '../lib/audit.js';
import type { AuditContext } from '../lib/audit.js';
import { getVatContext, resolveDefaultItemTaxRate } from './tax.services.js';
import type { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;
function toNum(d: DecimalLike): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  if (typeof d === 'string') return Number(d);
  return Number(d.toString());
}

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

export type InvoicePublic = {
  id: number;
  ownerId: number;
  clientId: number;
  number: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  sentAt?: Date | null;
  cancelledAt?: Date | null;
  notes?: string | null;
  terms?: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: number; fullName?: string | null; company?: string | null; email?: string | null };
  items?: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
  payments?: Array<{
    id: number;
    amount: number;
    method: 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'OTHER';
    reference?: string | null;
    receivedAt: Date;
    notes?: string | null;
  }>;
  events?: Array<{
    id: number;
    fromStatus?: InvoicePublic['status'] | null;
    toStatus: InvoicePublic['status'];
    reason?: string | null;
    createdAt: Date;
  }>;
};

function toPublic(inv: any, withChildren = false): InvoicePublic {
  const out: InvoicePublic = {
    id: Number(inv.id),
    ownerId: Number(inv.ownerId),
    clientId: Number(inv.clientId),
    number: inv.number,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency,
    status: inv.status,
    sentAt: inv.sentAt ?? null,
    cancelledAt: inv.cancelledAt ?? null,
    notes: inv.notes ?? null,
    terms: inv.terms ?? null,
    subtotal: toNum(inv.subtotal),
    taxTotal: toNum(inv.taxTotal),
    total: toNum(inv.total),
    paidAmount: toNum(inv.paidAmount),
    balanceDue: toNum(inv.balanceDue),
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
  if (withChildren) {
    out.items = (inv.items ?? []).map((it: any) => ({
      id: Number(it.id),
      description: it.description,
      quantity: toNum(it.quantity),
      unitPrice: toNum(it.unitPrice),
      taxRate: toNum(it.taxRate),
      total: toNum(it.total),
    }));
    out.payments = (inv.payments ?? []).map((p: any) => ({
      id: Number(p.id),
      amount: toNum(p.amount),
      method: p.method,
      reference: p.reference ?? null,
      receivedAt: p.receivedAt,
      notes: p.notes ?? null,
    }));
    out.events = (inv.events ?? []).map((e: any) => ({
      id: Number(e.id),
      fromStatus: e.fromStatus ?? null,
      toStatus: e.toStatus,
      reason: e.reason ?? null,
      createdAt: e.createdAt,
    }));
  }
  return out;
}

function computeItemTotal(qty: number, price: number, taxRatePct: number) {
  const subtotal = qty * price;
  const tax = subtotal * (taxRatePct / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function computeTotals(items: InvoiceItemInput[]) {
  let subtotal = 0;
  let taxTotal = 0;
  let total = 0;
  for (const it of items) {
    const {
      subtotal: s,
      tax,
      total: t,
    } = computeItemTotal(it.quantity, it.unitPrice, it.taxRate ?? 0);
    subtotal += s;
    taxTotal += tax;
    total += t;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: r(subtotal), taxTotal: r(taxTotal), total: r(total) };
}

async function recalcInvoiceAggregates(invId: bigint) {
  await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({
      where: { id: invId },
      include: { items: true, payments: true },
    });
    if (!inv) return;
    const items = inv.items.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      taxRate: Number(it.taxRate),
    }));
    const totals = computeTotals(items);
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Math.max(0, Math.round((totals.total - paid) * 100) / 100);

    let newStatus = inv.status as InvoicePublic['status'];
    if (inv.status !== 'CANCELLED') {
      if (paid >= totals.total - 0.009) newStatus = 'PAID';
      else if (paid > 0) newStatus = 'PARTIAL';
      else if (new Date() > inv.dueDate) newStatus = 'OVERDUE';
      else if (inv.sentAt) newStatus = 'SENT';
      else newStatus = 'DRAFT';
    }

    const updated = await tx.invoice.update({
      where: { id: invId },
      data: {
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paidAmount: paid,
        balanceDue: balance,
        status: newStatus as any,
      },
    });

    if (updated.status !== inv.status) {
      await tx.invoiceStatusEvent.create({
        data: {
          invoiceId: invId,
          fromStatus: inv.status as any,
          toStatus: updated.status as any,
          reason: 'auto-recalc',
        },
      });
    }
  });
}

function yearBounds(d = new Date()): { start: Date; end: Date } {
  const y = d.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
  return { start, end };
}

async function generateInvoiceNumber(ownerId: bigint) {
  const { start, end } = yearBounds();
  const count = await prisma.invoice.count({
    where: { ownerId, issueDate: { gte: start, lt: end } },
  });
  const seq = (count + 1).toString().padStart(4, '0');
  return `INV-${start.getUTCFullYear()}-${seq}`;
}

export async function listInvoicesForOwner(
  userId: number,
  opts: {
    q?: string;
    status?: InvoicePublic['status'];
    overdue?: boolean;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
    clientId?: number;
  },
) {
  const uid = BigInt(userId);
  const { q, status, overdue, from, to, page, pageSize, clientId } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.InvoiceWhereInput = { ownerId: uid };
  if (clientId) where.clientId = BigInt(clientId);
  if (status) where.status = status as any;
  if (from) where.issueDate = { ...(where.issueDate ?? {}), gte: new Date(from) };
  if (to) where.issueDate = { ...(where.issueDate ?? {}), lte: new Date(to) };
  if (overdue === true) {
    (where.AND ||= []).push({
      status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any },
      dueDate: { lt: new Date() },
    });
  }
  if (q && q.trim()) {
    (where.OR ||= []).push(
      { number: { contains: q, mode: 'insensitive' } },
      { client: { fullName: { contains: q, mode: 'insensitive' } } },
      { client: { company: { contains: q, mode: 'insensitive' } } },
    );
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: items.map((i) => toPublic(i /* tu peux étendre toPublic pour inclure client */)),
    total,
    page,
    pageSize,
  };
}

export async function allInvoiceSummary(userId: number) {
  const uid = BigInt(userId);
  const now = new Date();
  const [total, unpaid, overdue, paid] = await Promise.all([
    prisma.invoice.count({ where: { ownerId: uid } }),
    prisma.invoice.count({
      where: { ownerId: uid, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any } },
    }),
    prisma.invoice.count({
      where: {
        ownerId: uid,
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any },
      },
    }),
    prisma.invoice.count({ where: { ownerId: uid, status: 'PAID' as any } }),
  ]);
  return { total, unpaid, overdue, paid };
}

export async function createInvoice(
  userId: number,
  clientId: number,
  input: {
    number?: string;
    issueDate?: Date;
    dueDate: Date;
    currency?: string;
    notes?: string;
    terms?: string;
    items: InvoiceItemInput[];
    reverseCharge?: boolean;
  },
  audit?: AuditContext,
) {
  const uid = BigInt(userId);
  const cid = BigInt(clientId);
  const client = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!client) throw Object.assign(new Error('Client introuvable'), { status: 404 });
  const issueAt = input.issueDate ?? new Date();
  const defaultRate = await resolveDefaultItemTaxRate(userId, issueAt);
  const items = input.items.map((it) => ({ ...it, taxRate: it.taxRate ?? defaultRate }));
  const ctx = await getVatContext(userId, issueAt);
  if (ctx.regime === 'VAT' && !input.reverseCharge) {
    const allZero = items.every((i) => (i.taxRate ?? 0) === 0);
    if (allZero) {
      throw Object.assign(
        new Error(
          'TVA requise à partir de la date de bascule. Utilisez reverseCharge si applicable.',
        ),
        { status: 400 },
      );
    }
  }
  const totals = computeTotals(items);
  const number = input.number || (await generateInvoiceNumber(uid));

  const created = await prisma.invoice.create({
    data: {
      ownerId: uid,
      clientId: cid,
      number,
      issueDate: input.issueDate ?? new Date(),
      dueDate: input.dueDate,
      currency: input.currency ?? 'EUR',
      notes: input.notes,
      terms: input.terms,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      items: {
        create: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate ?? 0,
          total: computeItemTotal(it.quantity, it.unitPrice, it.taxRate ?? 0).total,
        })),
      },
    },
  });
  await recalcInvoiceAggregates(created.id);
  const full = await prisma.invoice.findUnique({
    where: { id: created.id },
    include: { items: true, payments: true, events: true },
  });
  // Audit: invoice created
  await auditLog({
    actorUserId: userId,
    entityType: 'invoice',
    entityId: created.id,
    action: 'create',
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    metadata: {
      requestId: audit?.requestId,
      reason: audit?.reason ?? null,
      input: redactSensitive(input),
      result: toPublic(full, true),
    },
  });
  return toPublic(full, true);
}

export async function listInvoicesByClient(
  userId: number,
  clientId: number,
  opts: { status?: InvoicePublic['status']; overdue?: boolean; page: number; pageSize: number },
) {
  const uid = BigInt(userId);
  const cid = BigInt(clientId);
  const client = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!client) throw Object.assign(new Error('Client introuvable'), { status: 404 });
  const { status, overdue, page, pageSize } = opts;
  const skip = (page - 1) * pageSize;
  const where: Prisma.InvoiceWhereInput = { clientId: cid };
  if (status) where.status = status as any;
  if (overdue === true)
    where.AND = [
      where.AND ?? [],
      { status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any }, dueDate: { lt: new Date() } },
    ];
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.count({ where }),
  ]);
  return { items: items.map((i) => toPublic(i)), total, page, pageSize };
}

export async function getInvoice(userId: number, id: number) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({
    where: { id: iid, ownerId: uid },
    include: { items: true, payments: true, events: true, client: true },
  });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  return toPublic(inv, true);
}

export async function updateInvoice(
  userId: number,
  id: number,
  input: {
    number?: string;
    issueDate?: Date;
    dueDate?: Date;
    currency?: string;
    notes?: string;
    terms?: string;
    items?: InvoiceItemInput[];
    reverseCharge?: boolean;
  },
  audit?: AuditContext,
) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  const beforeFull = await prisma.invoice.findUnique({
    where: { id: iid },
    include: { items: true, payments: true, events: true },
  });

  const issueAt = input.issueDate ?? new Date();
  const defaultRate = await resolveDefaultItemTaxRate(userId, issueAt);
  const ctx = await getVatContext(userId, issueAt);
  if (ctx.regime === 'VAT' && !input.reverseCharge && input.items && input.items.length > 0) {
    const allZero = input.items.every((i) => (i.taxRate ?? 0) === 0);
    if (allZero) {
      throw Object.assign(
        new Error(
          'TVA requise à partir de la date de bascule. Utilisez reverseCharge si applicable.',
        ),
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: iid },
      data: {
        number: input.number,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        notes: input.notes,
        terms: input.terms,
      },
    });
    if (input.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: iid } });
      await tx.invoiceItem.createMany({
        data: input.items.map((it) => ({
          invoiceId: iid,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate ?? defaultRate,
          total: computeItemTotal(it.quantity, it.unitPrice, it.taxRate ?? defaultRate).total,
        })),
      });
    }
  });
  await recalcInvoiceAggregates(iid);
  const full = await prisma.invoice.findUnique({
    where: { id: iid },
    include: { items: true, payments: true, events: true },
  });
  // Audit: invoice updated (before/after)
  await auditLog({
    actorUserId: userId,
    entityType: 'invoice',
    entityId: iid,
    action: 'update',
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    metadata: {
      requestId: audit?.requestId,
      reason: audit?.reason ?? null,
      input: redactSensitive(input),
      before: beforeFull ? toPublic(beforeFull, true) : null,
      after: toPublic(full, true),
    },
  });
  return toPublic(full, true);
}

export async function deleteInvoice(userId: number, id: number, audit?: AuditContext) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const beforeFull = await prisma.invoice.findFirst({
    where: { id: iid, ownerId: uid },
    include: { items: true, payments: true, events: true },
  });
  const del = await prisma.invoice.deleteMany({ where: { id: iid, ownerId: uid } });
  if (del.count === 0) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  // Audit: invoice deleted
  await auditLog({
    actorUserId: userId,
    entityType: 'invoice',
    entityId: iid,
    action: 'delete',
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    metadata: {
      requestId: audit?.requestId,
      reason: audit?.reason ?? null,
      before: beforeFull ? toPublic(beforeFull, true) : null,
    },
  });
}

export async function addPayment(
  userId: number,
  id: number,
  input: {
    amount: number;
    method: 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'OTHER';
    reference?: string;
    receivedAt?: Date;
    notes?: string;
  },
  audit?: AuditContext,
) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  const pay = await prisma.payment.create({
    data: {
      invoiceId: iid,
      amount: input.amount,
      method: input.method as any,
      reference: input.reference,
      receivedAt: input.receivedAt ?? new Date(),
      notes: input.notes,
    },
  });
  await recalcInvoiceAggregates(iid);
  const full = await prisma.invoice.findUnique({
    where: { id: iid },
    include: { items: true, payments: true, events: true },
  });
  // Audit: payment added
  await auditLog({
    actorUserId: userId,
    entityType: 'invoice',
    entityId: iid,
    action: 'payment_add',
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    metadata: {
      requestId: audit?.requestId,
      reason: audit?.reason ?? null,
      payment: { id: Number(pay.id), amount: input.amount, method: input.method, reference: input.reference },
      after: toPublic(full, true),
    },
  });
  return toPublic(full, true);
}

export async function removePayment(userId: number, invoiceId: number, paymentId: number, audit?: AuditContext) {
  const uid = BigInt(userId);
  const iid = BigInt(invoiceId);
  const pid = BigInt(paymentId);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  const pay = await prisma.payment.findUnique({ where: { id: pid } });
  await prisma.payment.deleteMany({ where: { id: pid, invoiceId: iid } });
  await recalcInvoiceAggregates(iid);
  // Audit: payment removed
  await auditLog({
    actorUserId: userId,
    entityType: 'invoice',
    entityId: iid,
    action: 'payment_remove',
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    metadata: {
      requestId: audit?.requestId,
      reason: audit?.reason ?? null,
      payment: pay ? { id: Number(pay.id), amount: Number(pay.amount), method: pay.method, reference: pay.reference } : { id: Number(pid) },
    },
  });
}

export async function markSent(userId: number, id: number, audit?: AuditContext) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  const updated = await prisma.invoice.update({
    where: { id: iid },
    data: { sentAt: inv.sentAt ?? new Date() },
  });
  if (!inv.sentAt) {
    await prisma.invoiceStatusEvent.create({
      data: {
        invoiceId: iid,
        fromStatus: inv.status as any,
        toStatus: 'SENT' as any,
        reason: 'marked-sent',
      },
    });
  }
  await recalcInvoiceAggregates(updated.id);
  const full = await prisma.invoice.findUnique({
    where: { id: iid },
    include: { items: true, payments: true, events: true },
  });
  // Audit: invoice marked as sent
  await auditLog({
    actorUserId: userId,
    entityType: 'invoice',
    entityId: iid,
    action: 'mark_sent',
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
    metadata: {
      requestId: audit?.requestId,
      reason: audit?.reason ?? null,
      after: toPublic(full, true),
    },
  });
  return toPublic(full, true);
}

async function getOwnerProfile(ownerId: bigint) {
  const [profile, user] = await Promise.all([
    prisma.ownerProfile.findUnique({ where: { ownerId } }),
    prisma.user.findUnique({ where: { id: ownerId } }),
  ]);
  return { profile, user };
}

function formatMoney(n: number, currency: any = 'EUR') {
  let code = typeof currency === 'string' ? currency : 'EUR';
  try {
    code = code.trim().toUpperCase();
  } catch {
    code = 'EUR';
  }
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }).format(n);
  } catch {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  }
}

export async function generateInvoicePdf(userId: number, id: number): Promise<Buffer> {
  const inv = await prisma.invoice.findFirst({
    where: { id: BigInt(id), ownerId: BigInt(userId) },
    include: { items: true, client: true, payments: true }
  })
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 })
  const { profile, user } = await getOwnerProfile(BigInt(userId))
  const html = await renderInvoiceHtml(inv, profile, user)
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle' })
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '56px', bottom: '56px', left: '40px', right: '40px' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:10px;width:100%;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;"><span>${escapeHtml(profile?.companyName ?? user?.fullName ?? '')}</span><span>Facture ${escapeHtml(inv.number)}</span></div>`,
    footerTemplate: `<div style="font-size:10px;width:100%;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;"><span></span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`
  })
  await browser.close()
  return pdf
}

function escapeHtml(s: any) {
  const str = String(s ?? '')
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

async function inlineLogo(profile: any, fallbackPath?: string) {
   if (profile?.logoUrl) return `<img src="${escapeHtml(profile.logoUrl)}" alt="" style="max-width:140px;max-height:44px;object-fit:contain;">`
  const p = fallbackPath || path.join(process.cwd(), 'public', 'DD-Logo.svg')
  const buf = await fs.promises.readFile(p)
  const ext = path.extname(p).toLowerCase()
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'
  const b64 = buf.toString('base64')
  return `<img src="data:${mime};base64,${b64}" alt="" style="max-width:140px;max-height:44px;object-fit:contain;">`
}

async function renderInvoiceHtml(inv: any, profile: any, user: any) {
  const currency = inv.currency || 'EUR'
  const money = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n)
  const fmtDate = (d: any) => new Date(d).toLocaleDateString('fr-FR')
  const statusMap: Record<string,string> = { DRAFT:'BROUILLON', SENT:'ENVOYÉ', PARTIAL:'PARTIEL', PAID:'PAYÉ', OVERDUE:'EN RETARD', CANCELLED:'ANNULÉ' }
  const status = statusMap[inv.status] || inv.status
  const brand = String(profile?.brandColor || '#2563eb')
  const paid = Number(inv.paidAmount || 0)
  const balance = Math.max(0, Number(inv.total || 0) - paid)
  const rows = inv.items.map((it: any) => {
    const desc = escapeHtml(it.description ?? '')
    const qty = Number(it.quantity)
    const unit = Number(it.unitPrice)
    const vat = Number(it.taxRate)
    const tot = Number(it.total)
    return `<tr><td>${desc}</td><td class="num">${qty}</td><td class="num">${money(unit)}</td><td class="num">${vat.toFixed(2)}%</td><td class="num">${money(tot)}</td></tr>`
  }).join('')
  const taxGroups: Array<{rate:number,base:number,tax:number}> = []
  for (const it of inv.items) {
    const qty = Number(it.quantity)
    const unit = Number(it.unitPrice)
    const rate = Number(it.taxRate)
    const base = qty * unit
    const tax = base * rate / 100
    const found = taxGroups.find(g => g.rate === rate)
    if (found) { found.base += base; found.tax += tax } else { taxGroups.push({ rate, base, tax }) }
  }
  taxGroups.sort((a,b)=>a.rate-b.rate)
  const taxRows = taxGroups.map(g => `<tr><td>Base ${g.rate.toFixed(2)}%</td><td class="num">${money(Math.round(g.base*100)/100)}</td><td class="num">${money(Math.round(g.tax*100)/100)}</td></tr>`).join('')
  const sellerLines = [
    profile?.companyName ?? user?.fullName ?? '',
    profile?.fullName && profile?.fullName !== profile?.companyName ? profile.fullName : '',
    profile?.addressLine1 ?? '',
    profile?.addressLine2 ?? '',
    [profile?.postalCode, profile?.city].filter(Boolean).join(' '),
    profile?.country ?? '',
    profile?.email ? `Email: ${profile.email}` : '',
    profile?.phone ? `Téléphone: ${profile.phone}` : '',
    profile?.registrationNumber ? `SIREN/SIRET: ${profile.registrationNumber}` : '',
    profile?.vatNumber ? `TVA intracom: ${profile.vatNumber}` : ''
  ].filter(Boolean).map(escapeHtml).join('<br>')
  const clientLines = [
    [inv.client?.company, inv.client?.fullName].filter(Boolean).join(' · '),
    inv.client?.email ? `Email: ${inv.client.email}` : ''
  ].filter(Boolean).map(escapeHtml).join('<br>')
  const regime = await getVatContext(Number(inv.ownerId), inv.issueDate).catch(()=>null)
  const franchise = regime && regime.regime === 'FRANCHISE'
  const badgeClass = inv.status === 'PAID' ? 'paid' : inv.status === 'OVERDUE' || 'PARTIAL' ? 'overdue' : 'info'
  const logo = await inlineLogo(profile, process.env.INVOICE_LOGO_PATH);
  return `
<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<style>
@page { size: A4; margin: 56px 40px; }
:root { --brand: ${brand}; --text:#0f172a; --muted:#475569; --line:#e2e8f0; --head:#f8fafc; --zebra:#f9fafb; --ok:#16a34a; --danger:#dc2626; }
* { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: var(--text); font-size: 12px; }
h1 { margin: 0 0 8px; font-size: 22px; color: var(--brand); }
small { color: var(--muted); }
.header { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; margin-bottom: 18px; }
.card { border: 1px solid var(--line); border-radius: 12px; background: var(--head); padding: 12px 14px; }
.meta { font-size: 12px; line-height: 1.5; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
.divider { height: 1px; background: var(--line); margin: 14px 0; }
.kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; }
.kv .k { color: var(--muted); }
.table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
th, td { padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 11px; text-align: left; color: var(--brand); background: #eff6ff; }
tbody tr:nth-child(odd) td { background: var(--zebra); }
.num { text-align: right; white-space: nowrap; }
.wrap { word-break: break-word; }
.totals { display: grid; grid-template-columns: 1fr 320px; gap: 16px; margin-top: 16px; }
.box { border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 12px 14px; }
.badge { display:inline-block; padding: 2px 10px; border-radius: 999px; font-size: 10px; color: #fff; background: var(--brand); }
.badge.paid { background: var(--ok); }
.badge.overdue { background: var(--danger); }
.footer { margin-top: 12px; color: var(--muted); font-size: 11px; }
.watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 120px; color: var(--ok); opacity: .08; transform: rotate(-20deg); pointer-events: none; }
.pay-badge { display:inline-block; padding: 3px 10px; border-radius: 8px; background: #eff6ff; color: var(--brand); font-size: 10px; border: 1px solid var(--line); }
.tax-table { width:100%; border-collapse:collapse; }
.tax-table td { padding:6px 8px; border-bottom:1px solid var(--line); }
.signature { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; }
.sigbox { border:1px dashed var(--line); border-radius:10px; padding:10px 12px; height:90px; }
</style>
<body>
  ${inv.status === 'PAID' ? `<div class="watermark">PAYÉ</div>` : ``}
  <div class="header">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">${logo}</div>
      <div class="grid">
        <div class="meta">
          <div>Agence Double D</div>
        </div>
        <div class="meta">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div style="font-weight:700;font-size:18px;color:var(--brand)">FACTURE</div>
            <span class="badge ${badgeClass}">${escapeHtml(status)}</span>
          </div>
          <div class="divider"></div>
          <div class="kv">
            <div class="k">Numéro</div><div>${escapeHtml(inv.number)}</div>
            <div class="k">Émise le</div><div>${fmtDate(inv.issueDate)}</div>
            <div class="k">Échéance</div><div>${fmtDate(inv.dueDate)}</div>
            <div class="k">Client</div><div>${clientLines || '-'}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="card meta">
      <div style="font-weight:600;margin-bottom:6px">Règlement</div>
      ${profile?.bankName ? `<div>Banque: ${escapeHtml(profile.bankName)}</div>` : ''}
      ${profile?.iban ? `<div>IBAN: ${escapeHtml(profile.iban)}</div>` : ''}
      ${profile?.bic ? `<div>BIC: ${escapeHtml(profile.bic)}</div>` : ''}
      ${profile?.email ? `<div>Contact: ${escapeHtml(profile.email)}</div>` : ''}
      ${profile?.phone ? `<div>Téléphone: ${escapeHtml(profile.phone)}</div>` : ''}
      ${balance > 0 ? `<div style="margin-top:8px"><span class="pay-badge">À régler avant le ${fmtDate(inv.dueDate)}</span></div>` : ''}
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Designation</th>
        <th class="num">Qté</th>
        <th class="num">PU HT</th>
        <th class="num">TVA %</th>
        <th class="num">Total TTC</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5" class="wrap">Aucune ligne</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="box">
      ${inv.notes ? `<div style="margin-bottom:8px"><div style="font-weight:600;margin-bottom:4px">Notes</div><div>${escapeHtml(inv.notes)}</div></div>` : ``}
      ${inv.terms ? `<div style="margin-bottom:8px"><div style="font-weight:600;margin-bottom:4px">Conditions</div><div>${escapeHtml(inv.terms)}</div></div>` : ``}
      ${franchise ? `<div style="margin-top:6px">TVA non applicable – article 293 B du CGI</div>` : ``}
      ${taxRows ? `<div style="margin-top:10px"><div style="font-weight:600;margin-bottom:4px">Détail TVA</div><table class="tax-table"><tbody>${taxRows}</tbody></table></div>` : ``}
      <div class="signature">
        <div class="sigbox"><div style="font-size:11px;color:var(--muted)">Signature émetteur</div></div>
        <div class="sigbox"><div style="font-size:11px;color:var(--muted)">Signature client</div></div>
      </div>
    </div>
    <div class="box">
      <table style="width:100%;border-collapse:collapse">
        <tr><td>Sous-total</td><td class="num">${money(Number(inv.subtotal))}</td></tr>
        <tr><td>TVA</td><td class="num">${money(Number(inv.taxTotal))}</td></tr>
        <tr><td style="font-weight:600">Total</td><td class="num" style="font-weight:600">${money(Number(inv.total))}</td></tr>
        <tr><td>Déjà payé</td><td class="num">${money(Number(inv.paidAmount))}</td></tr>
        <tr><td style="font-weight:600">Restant dû</td><td class="num" style="font-weight:600">${money(Number(inv.balanceDue))}</td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    ${[profile?.website, profile?.email, profile?.phone].filter(Boolean).map(escapeHtml).join(' • ')}
    ${profile?.registrationNumber ? ' • ' + escapeHtml('SIREN/SIRET ' + profile.registrationNumber) : ''}
  </div>
</body>
</html>
`
}

export async function clientInvoiceSummary(userId: number, clientId: number) {
  const uid = BigInt(userId);
  const cid = BigInt(clientId);

  const client = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!client) throw Object.assign(new Error('Client introuvable'), { status: 404 });

  const now = new Date();

  const [total, unpaid, overdue, paid, anyPastOverdue] = await Promise.all([
    prisma.invoice.count({ where: { clientId: cid } }),
    prisma.invoice.count({
      where: { clientId: cid, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any } },
    }),
    prisma.invoice.count({
      where: {
        clientId: cid,
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any },
      },
    }),
    prisma.invoice.count({ where: { clientId: cid, status: 'PAID' as any } }),
    prisma.invoiceStatusEvent.count({
      where: { invoice: { clientId: cid }, toStatus: 'OVERDUE' as any },
    }),
  ]);
  const [sumAll, sumUnpaid, sumOverdue, sumPaid] = await Promise.all([
    prisma.invoice.aggregate({
      where: { clientId: cid },
      _sum: { total: true, paidAmount: true, balanceDue: true },
    }),
    prisma.invoice.aggregate({
      where: { clientId: cid, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any } },
      _sum: { balanceDue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        clientId: cid,
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] as any },
      },
      _sum: { balanceDue: true },
    }),
    prisma.invoice.aggregate({
      where: { clientId: cid, status: 'PAID' as any },
      _sum: { total: true },
    }),
  ]);

  const toNum = (n: any) => Number(n ?? 0);

  return {
    counts: { total, unpaid, overdue, paid },
    amounts: {
      total: toNum(sumAll._sum.total),
      unpaid: toNum(sumUnpaid._sum.balanceDue),
      overdue: toNum(sumOverdue._sum.balanceDue),
      paid: toNum(sumPaid._sum.total),
    },
    hadPastOverdue: anyPastOverdue > 0,
  };
}
