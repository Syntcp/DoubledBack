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
  const uid = BigInt(userId);
  const iid = BigInt(id);

  const inv = await prisma.invoice.findFirst({
    where: { id: iid, ownerId: uid },
    include: { items: true, client: true, payments: true },
  });
  if (!inv) throw Object.assign(new Error('Facture introuvable'), { status: 404 });

  const { profile, user } = await getOwnerProfile(uid);

  const MARGIN = 40;
  const THEME = {
    text:        '#0f172a',
    muted:       '#64748b',
    line:        '#e5e7eb',
    headBg:      '#f8fafc',
    zebra:       '#f9fafb',
    brand:       (profile as any)?.brandColor || '#2563eb',
    brandLight:  '#eff6ff',
    success:     '#16a34a',
    danger:      '#dc2626',
    white:       '#ffffff',
  } as const;

  function fmtDate(d: unknown) {
    try {
      if (!d) return '';
      const dd = d instanceof Date ? d : new Date(d as any);
      return dd.toLocaleDateString('fr-FR');
    } catch { return ''; }
  }
  const money = (n: number) => formatMoney(n, (inv as any).currency);

  async function loadLogo(): Promise<Buffer | null> {
    try {
      const logoUrl = (profile as any)?.logoUrl as string | undefined;
      if (!logoUrl) return null;
      if (logoUrl.startsWith('data:')) {
        const base64 = logoUrl.split(',')[1];
        return Buffer.from(base64, 'base64');
      }
      const r = await fetch(logoUrl);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return Buffer.from(ab);
    } catch { return null; }
  }
  const logoBuf = await loadLogo().catch(() => null);

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
  doc.fillColor(THEME.text);

  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (d) => chunks.push(d as Buffer));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentW = pageW - MARGIN * 2;

    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(inv.total) - paid);

    // Ligne horizontale
    // Pagination contrôlée (répète l'entête de tableau si on est dedans)
    const need = (space: number, onTable = false) => {
      if (doc.y + space <= pageH - MARGIN - 50) return;
      doc.addPage();
      if (onTable) drawTableHead();
    };

    // Libellés
    const label = (t: string) => doc.font('Helvetica-Bold').fillColor(THEME.text).text(t);
    const value = (t: string) => doc.font('Helvetica').fillColor(THEME.text).text(t);

    // ——— Header ————————————————————————————————————————————————
    const drawHeader = () => {
      // Bande fine brand en haut
      doc.save()
        .rect(0, 0, pageW, 4)
        .fill(THEME.brand)
        .restore();

      // Logo (gauche)
      const topY = MARGIN - 8;
      if (logoBuf) {
        try {
          doc.image(logoBuf, MARGIN, topY, { width: 120, height: 40, fit: [120, 40] });
        } catch { /* ignore logo */ }
      } else {
        doc.font('Helvetica-Bold')
          .fontSize(18)
          .fillColor(THEME.brand)
          .text(profile?.companyName ?? user?.fullName ?? 'Votre société', MARGIN, topY, { width: contentW * 0.5 });
      }

      // Cartouche "FACTURE" + méta (droite)
      const boxW = 260;
      const boxX = pageW - MARGIN - boxW;
      const boxY = topY;
      const c = inv.client ?? ({} as any);
      const clientName = [c.fullName, c.company].filter(Boolean).join(' · ');
      doc.save()
        .roundedRect(boxX, boxY, boxW, 120, 10)
        .fillAndStroke(THEME.headBg, THEME.line)
        .restore();

      doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(THEME.brand)
        .text('FACTURE', boxX + 12, boxY + 10);

      doc.font('Helvetica').fontSize(10).fillColor(THEME.text);
      doc.text(`Numéro de Facture : ${inv.number}`, boxX + 12, boxY + 50, { width: boxW - 24 });
      doc.text(`Émise le : ${fmtDate(inv.issueDate)}`);
      doc.text(`Échéance : ${fmtDate(inv.dueDate)}`);
      doc.text(`Client : ${clientName}`)
      doc.text(`Email : ${c.email}`)

      // Badge statut
      try {
        const pill = ` ${inv.status} `;
        const pw = doc.widthOfString(pill) + 16;
        const ph = 18;
        const px = boxX + boxW - pw - 12;
        const py = boxY + 5;
        const color =
          inv.status === 'PAID' ? THEME.success :
          inv.status === 'OVERDUE' ? THEME.danger : THEME.brand;

        doc.save()
          .roundedRect(px, py, pw, ph, 9).fill(color)
          .font('Helvetica-Bold').fontSize(10).fillColor(THEME.white)
          .text(pill, px, py + 5, { width: pw, align: 'center' })
          .restore();
      } catch {}

      doc.moveDown(1.4);

      // Bloc vendeur (sous le logo)
      const sellerX = MARGIN;
      const sellerY = topY + 58;
      const sellerW = contentW * 0.55;

      doc.font('Helvetica-Bold').fontSize(11).fillColor(THEME.text)
        .text(profile?.companyName ?? user?.fullName ?? 'Votre société', sellerX, sellerY, { width: sellerW });
      doc.font('Helvetica').fontSize(10).fillColor(THEME.muted);

      const sellerLines: string[] = [];
      if (profile?.fullName || user?.fullName) sellerLines.push(String(profile?.fullName ?? user?.fullName));
      if (profile?.addressLine1) sellerLines.push(profile.addressLine1);
      if (profile?.addressLine2) sellerLines.push(profile.addressLine2);
      const cityLine = [profile?.postalCode, profile?.city].filter(Boolean).join(' ');
      if (cityLine) sellerLines.push(cityLine);
      if (profile?.country) sellerLines.push(String(profile.country));
      if (profile?.email) sellerLines.push(`Email: ${profile.email}`);
      if (profile?.phone) sellerLines.push(`Téléphone: ${profile.phone}`);
      if (profile?.registrationNumber) sellerLines.push(`SIREN/SIRET: ${profile.registrationNumber}`);

      sellerLines.forEach((l) => doc.text(l, { width: sellerW }));

      // Tampon PAYÉ en filigrane si payé
      if (inv.status === 'PAID') {
        const cx = MARGIN + contentW * 0.35, cy = doc.y - 0;
        try {
          doc.save()
            .rotate(-12, { origin: [cx, cy] })
            .fillColor(THEME.success).fillOpacity(0.08)
            .rect(cx - 120, cy - 22, 240, 44).fill()
            .fillOpacity(1).font('Helvetica-Bold').fontSize(24)
            .fillColor(THEME.success)
            .text('PAYÉ', cx - 70, cy - 10, { width: 140, align: 'center' })
            .restore();
        } catch {}
      }
    };

    // ——— Tableau des lignes ————————————————————————————————
    const cols = [
      { label: 'Description', w: Math.floor(contentW * 0.50), align: 'left'  as const },
      { label: 'Qté',         w: 48,                           align: 'left' as const },
      { label: 'PU HT',       w: 48,                           align: 'left' as const },
      { label: 'TVA %',       w: 48,                           align: 'left' as const },
      { label: 'Total TTC',   w: 48,                           align: 'left' as const },
    ];
    const gap = 10;
    const x0 = MARGIN;
    const colX = (i: number) => x0 + cols.slice(0, i).reduce((s, c) => s + c.w + gap, 0);

    const drawTableHead = () => {
      const h = 26;
      doc.save()
        .rect(MARGIN, doc.y, contentW, h).fill(THEME.brandLight)
        .restore()
        .strokeColor(THEME.line).lineWidth(0.5)
        .moveTo(MARGIN, doc.y + h).lineTo(pageW - MARGIN, doc.y + h).stroke();

      doc.font('Helvetica-Bold').fontSize(10).fillColor(THEME.brand);
      cols.forEach((c, i) => {
        doc.text(c.label, colX(i), doc.y + 8, { width: c.w, align: c.align });
      });
      doc.moveDown(1.1);
    };

    const drawRows = () => {
      doc.font('Helvetica').fontSize(10).fillColor(THEME.text);

      inv.items.forEach((it, idx) => {
        const desc = String(it.description || '');
        const qty  = Number(it.quantity);
        const unit = Number(it.unitPrice);
        const tax  = Number(it.taxRate);
        const tot  = Number(it.total);

        const descH = doc.heightOfString(desc, { width: cols[0].w, align: 'left' });
        const lineH = Math.max(20, descH + 8);

        need(lineH + 6, true);

        if (idx % 2 === 1) {
          doc.save().rect(MARGIN, doc.y - 2, contentW, lineH).fill(THEME.zebra).restore();
        }

        doc.fillColor(THEME.text);
        doc.text(desc, colX(0), doc.y + 4, { width: cols[0].w, align: 'left' });
        doc.text(String(qty), colX(1), doc.y + 4, { width: cols[1].w, align: 'right' });
        doc.text(money(unit), colX(2), doc.y + 4, { width: cols[2].w, align: 'right' });
        doc.text(tax.toFixed(2), colX(3), doc.y + 4, { width: cols[3].w, align: 'right' });
        doc.text(money(tot), colX(4), doc.y + 4, { width: cols[4].w, align: 'right' });

        doc.strokeColor(THEME.line).lineWidth(0.5)
          .moveTo(MARGIN, doc.y + lineH).lineTo(pageW - MARGIN, doc.y + lineH).stroke();

        doc.y += lineH;
      });
      doc.moveDown(0.4);
    };

    // ——— Totaux + Règlement ————————————————————————————————
    const drawTotals = () => {
      need(140);

      const boxW = 300;
      const boxX = pageW - MARGIN - boxW;
      const startY = doc.y + 6;

      doc.save()
        .roundedRect(boxX, startY, boxW, 300, 10)
        .fillAndStroke(THEME.white, THEME.line)
        .restore();

      const row = (labelTxt: string, valTxt: string, bold = false) => {
        const lh = 22;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(THEME.text);
        doc.text(labelTxt, boxX + 10, doc.y + 8, { width: boxW - 120, align: 'left' });
        doc.text(valTxt,   boxX + boxW - 10 - 110, doc.y + 8, { width: 110, align: 'right' });
        doc.y += lh;
      };

      doc.y = startY + 2;
      row('Sous-total',  money(Number(inv.subtotal)));
      row('TVA',         money(Number(inv.taxTotal)));
      row('Total',       money(Number(inv.total)), true);
      row('Déjà payé',   money(inv.paidAmount));
      row('Restant dû',  money(inv.balanceDue), true);

      // Badge d’échéance si reste à payer
      if (balance > 0) {
        const badge = `À payer avant le ${fmtDate(inv.dueDate)}`;
        const bw = doc.widthOfString(badge) + 14;
        const by = startY - 18;
        const bx = boxX + boxW - bw;
        doc.save()
          .roundedRect(bx, by, bw, 16, 6)
          .fillAndStroke(THEME.brandLight, THEME.line)
          .font('Helvetica').fontSize(9).fillColor(THEME.brand)
          .text(badge, bx + 7, by + 3)
          .restore();
      }

      // Panneau Règlement (gauche)
      const payX = MARGIN;
      const payW = contentW - boxW - 16;
      const payH = 132;

      doc.save()
        .roundedRect(payX, startY, payW, payH, 10)
        .fillAndStroke(THEME.headBg, THEME.line)
        .restore();

      doc.font('Helvetica-Bold').fontSize(11).fillColor(THEME.text)
        .text('Règlement', payX + 12, startY + 10);

      doc.font('Helvetica').fontSize(10).fillColor(THEME.text);
      const lines: string[] = [];
      const iban = (profile as any)?.iban;
      const bic  = (profile as any)?.bic;
      const bank = (profile as any)?.bankName;

      if (bank) lines.push(`Banque : ${bank}`);
      if (iban) lines.push(`IBAN : ${iban}`);
      if (bic)  lines.push(`BIC : ${bic}`);
      if (profile?.email) lines.push(`Contact : ${profile.email}`);
      if (profile?.phone) lines.push(`Téléphone : ${profile.phone}`);
      if (lines.length === 0) lines.push('Merci d’effectuer le virement selon les modalités convenues.');

      lines.forEach((l, i) => {
        doc.text(l, payX + 12, startY + 34 + i * 16, { width: payW - 24 });
      });

      doc.y = Math.max(doc.y, startY + payH);
      doc.moveDown(1);
    };

    // ——— Notes / mentions ————————————————————————————————
    const drawNotes = () => {
      const block = (title: string, text?: string | null) => {
        if (!text) return;
        label(title);
        doc.moveDown(0.2);
        doc.font('Helvetica').fillColor(THEME.text).fontSize(10)
          .text(text, { width: contentW });
        doc.moveDown(0.8);
      };

      block('Notes', inv.notes);
      block('Conditions', inv.terms);
    };

    // ——— Footer discret et STABLE (pas de pageAdded, pas de dépassement) ———
    const drawFooter = () => {
      const y = pageH - MARGIN - 14; // toujours au-dessus de la marge
      const left = [profile?.website, profile?.email, profile?.phone].filter(Boolean).join('  •  ');
      const prevY = doc.y; // ne pas polluer le flux
      doc.save()
        .fontSize(9).fillColor(THEME.muted)
        .text(left, MARGIN, y, { width: contentW * 0.6, align: 'left', lineBreak: false })
        .text(`Page ${doc.page.number}`, MARGIN + contentW * 0.6, y, { width: contentW * 0.4, align: 'right', lineBreak: false })
        .restore();
      doc.y = prevY;
    };

    // ——— Orchestration ———————————————————————————————————————
    drawHeader();
    doc.moveDown(0.4);
    drawTableHead();
    drawRows();
    drawTotals();
    drawNotes();
    drawFooter();

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
