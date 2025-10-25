// @ts-nocheck
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';

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
  taxRate?: number; // percent
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
  // round to 2 decimals
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

    // determine status automatically (unless cancelled)
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
  },
) {
  const uid = BigInt(userId);
  const cid = BigInt(clientId);
  const client = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!client) throw Object.assign(new Error('Client introuvable'), { status: 404 });
  const items = input.items.map((it) => ({ ...it, taxRate: it.taxRate ?? 0 }));
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
  },
) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });

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
          taxRate: it.taxRate ?? 0,
          total: computeItemTotal(it.quantity, it.unitPrice, it.taxRate ?? 0).total,
        })),
      });
    }
  });
  await recalcInvoiceAggregates(iid);
  const full = await prisma.invoice.findUnique({
    where: { id: iid },
    include: { items: true, payments: true, events: true },
  });
  return toPublic(full, true);
}

export async function deleteInvoice(userId: number, id: number) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const del = await prisma.invoice.deleteMany({ where: { id: iid, ownerId: uid } });
  if (del.count === 0) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
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
) {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  await prisma.payment.create({
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
  return toPublic(full, true);
}

export async function removePayment(userId: number, invoiceId: number, paymentId: number) {
  const uid = BigInt(userId);
  const iid = BigInt(invoiceId);
  const pid = BigInt(paymentId);
  const inv = await prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  await prisma.payment.deleteMany({ where: { id: pid, invoiceId: iid } });
  await recalcInvoiceAggregates(iid);
}

export async function markSent(userId: number, id: number) {
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
  return toPublic(full, true);
}

async function getOwnerProfile(ownerId: bigint) {
  const [profile, user] = await Promise.all([
    prisma.ownerProfile.findUnique({ where: { ownerId } }),
    prisma.user.findUnique({ where: { id: ownerId } }),
  ]);
  return { profile, user };
}

function formatMoney(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n);
}

export async function generateInvoicePdf(userId: number, id: number): Promise<Buffer> {
  const uid = BigInt(userId);
  const iid = BigInt(id);
  const inv = await prisma.invoice.findFirst({
    where: { id: iid, ownerId: uid },
    include: { items: true, client: true, payments: true },
  });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });
  const { profile, user } = await getOwnerProfile(uid);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (d) => chunks.push(d as Buffer));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Header
    doc.fontSize(20).text('FACTURE', { align: 'right' });
    doc.moveDown();

    // Seller block
    doc.fontSize(12).text(profile?.companyName ?? 'Votre société');
    if (profile?.fullName || user?.fullName) doc.text(profile?.fullName ?? user?.fullName ?? '');
    if (profile?.addressLine1) doc.text(profile.addressLine1);
    if (profile?.addressLine2) doc.text(profile.addressLine2);
    const cityLine = [profile?.postalCode, profile?.city].filter(Boolean).join(' ');
    if (cityLine) doc.text(cityLine);
    if (profile?.country) doc.text(profile.country);
    if (profile?.email) doc.text(`Email: ${profile.email}`);
    if (profile?.phone) doc.text(`Téléphone: ${profile.phone}`);
    if (profile?.website) doc.text(`Site: ${profile.website}`);
    if (profile?.vatNumber) doc.text(`TVA: ${profile.vatNumber}`);
    if (profile?.registrationNumber) doc.text(`SIREN/SIRET: ${profile.registrationNumber}`);

    // Invoice meta
    doc.moveDown();
    doc.text(`Numéro: ${inv.number}`);
    doc.text(`Date d'émission: ${inv.issueDate.toLocaleDateString('fr-FR')}`);
    doc.text(`Échéance: ${inv.dueDate.toLocaleDateString('fr-FR')}`);
    doc.text(`Statut: ${inv.status}`);

    // Client block
    doc.moveDown();
    doc.text('Client:', { underline: true });
    const clientName = [inv.client.fullName, inv.client.company].filter(Boolean).join(' - ');
    doc.text(clientName);
    if (inv.client.email) doc.text(inv.client.email);
    if (inv.client.phone) doc.text(inv.client.phone);

    // Items table
    doc.moveDown();
    doc.fontSize(12).text('Détails', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, doc.y, { continued: true });
    const colQty = 320,
      colUnit = 380,
      colTax = 450,
      colTotal = 520;
    doc.text('Qté', colQty, undefined, { width: 40, align: 'right', continued: true });
    doc.text('PU', colUnit, undefined, { width: 60, align: 'right', continued: true });
    doc.text('TVA%', colTax, undefined, { width: 50, align: 'right', continued: true });
    doc.text('Total', colTotal, undefined, { width: 70, align: 'right' });
    doc.font('Helvetica');

    for (const it of inv.items) {
      const qty = Number(it.quantity);
      const unit = Number(it.unitPrice);
      const tva = Number(it.taxRate);
      const total = Number(it.total);
      doc.text(it.description, 50, doc.y, { continued: true });
      doc.text(qty.toString(), colQty, undefined, { width: 40, align: 'right', continued: true });
      doc.text(formatMoney(unit, inv.currency), colUnit, undefined, {
        width: 60,
        align: 'right',
        continued: true,
      });
      doc.text(tva.toFixed(2), colTax, undefined, { width: 50, align: 'right', continued: true });
      doc.text(formatMoney(total, inv.currency), colTotal, undefined, {
        width: 70,
        align: 'right',
      });
    }

    doc.moveDown();
    // Totals
    const rightCol = 400;
    doc.text('Sous-total:', rightCol, doc.y, { continued: true });
    doc.text(formatMoney(Number(inv.subtotal), inv.currency), 500, undefined, {
      width: 90,
      align: 'right',
    });
    doc.text('TVA:', rightCol, doc.y, { continued: true });
    doc.text(formatMoney(Number(inv.taxTotal), inv.currency), 500, undefined, {
      width: 90,
      align: 'right',
    });
    doc.font('Helvetica-Bold');
    doc.text('Total:', rightCol, doc.y, { continued: true });
    doc.text(formatMoney(Number(inv.total), inv.currency), 500, undefined, {
      width: 90,
      align: 'right',
    });
    doc.font('Helvetica');
    doc.text('Déjà payé:', rightCol, doc.y, { continued: true });
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    doc.text(formatMoney(paid, inv.currency), 500, undefined, { width: 90, align: 'right' });
    doc.text('Restant dû:', rightCol, doc.y, { continued: true });
    doc.text(formatMoney(Math.max(0, Number(inv.total) - paid), inv.currency), 500, undefined, {
      width: 90,
      align: 'right',
    });

    // Notes / terms
    if (inv.notes) {
      doc.moveDown();
      doc.text('Notes:', { underline: true });
      doc.text(inv.notes);
    }
    if (inv.terms) {
      doc.moveDown();
      doc.text('Conditions:', { underline: true });
      doc.text(inv.terms);
    }

    doc.end();
  });
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
  return { total, unpaid, overdue, paid, hadPastOverdue: anyPastOverdue > 0 };
}
