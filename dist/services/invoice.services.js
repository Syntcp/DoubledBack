"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvoice = createInvoice;
exports.listInvoicesByClient = listInvoicesByClient;
exports.getInvoice = getInvoice;
exports.updateInvoice = updateInvoice;
exports.deleteInvoice = deleteInvoice;
exports.addPayment = addPayment;
exports.removePayment = removePayment;
exports.markSent = markSent;
exports.generateInvoicePdf = generateInvoicePdf;
exports.clientInvoiceSummary = clientInvoiceSummary;
// @ts-nocheck
const prisma_js_1 = require("../lib/prisma.js");
function toNum(d) {
    if (d == null)
        return 0;
    if (typeof d === 'number')
        return d;
    if (typeof d === 'string')
        return Number(d);
    return Number(d.toString());
}
function toPublic(inv, withChildren = false) {
    const out = {
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
        out.items = (inv.items ?? []).map((it) => ({
            id: Number(it.id),
            description: it.description,
            quantity: toNum(it.quantity),
            unitPrice: toNum(it.unitPrice),
            taxRate: toNum(it.taxRate),
            total: toNum(it.total),
        }));
        out.payments = (inv.payments ?? []).map((p) => ({
            id: Number(p.id),
            amount: toNum(p.amount),
            method: p.method,
            reference: p.reference ?? null,
            receivedAt: p.receivedAt,
            notes: p.notes ?? null,
        }));
        out.events = (inv.events ?? []).map((e) => ({
            id: Number(e.id),
            fromStatus: e.fromStatus ?? null,
            toStatus: e.toStatus,
            reason: e.reason ?? null,
            createdAt: e.createdAt,
        }));
    }
    return out;
}
function computeItemTotal(qty, price, taxRatePct) {
    const subtotal = qty * price;
    const tax = subtotal * (taxRatePct / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
}
function computeTotals(items) {
    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;
    for (const it of items) {
        const { subtotal: s, tax, total: t } = computeItemTotal(it.quantity, it.unitPrice, it.taxRate ?? 0);
        subtotal += s;
        taxTotal += tax;
        total += t;
    }
    // round to 2 decimals
    const r = (n) => Math.round(n * 100) / 100;
    return { subtotal: r(subtotal), taxTotal: r(taxTotal), total: r(total) };
}
async function recalcInvoiceAggregates(invId) {
    await prisma_js_1.prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.findUnique({
            where: { id: invId },
            include: { items: true, payments: true },
        });
        if (!inv)
            return;
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
        let newStatus = inv.status;
        if (inv.status !== 'CANCELLED') {
            if (paid >= totals.total - 0.009)
                newStatus = 'PAID';
            else if (paid > 0)
                newStatus = 'PARTIAL';
            else if (new Date() > inv.dueDate)
                newStatus = 'OVERDUE';
            else if (inv.sentAt)
                newStatus = 'SENT';
            else
                newStatus = 'DRAFT';
        }
        const updated = await tx.invoice.update({
            where: { id: invId },
            data: {
                subtotal: totals.subtotal,
                taxTotal: totals.taxTotal,
                total: totals.total,
                paidAmount: paid,
                balanceDue: balance,
                status: newStatus,
            },
        });
        if (updated.status !== inv.status) {
            await tx.invoiceStatusEvent.create({
                data: {
                    invoiceId: invId,
                    fromStatus: inv.status,
                    toStatus: updated.status,
                    reason: 'auto-recalc',
                },
            });
        }
    });
}
function yearBounds(d = new Date()) {
    const y = d.getUTCFullYear();
    const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
    return { start, end };
}
async function generateInvoiceNumber(ownerId) {
    const { start, end } = yearBounds();
    const count = await prisma_js_1.prisma.invoice.count({ where: { ownerId, issueDate: { gte: start, lt: end } } });
    const seq = (count + 1).toString().padStart(4, '0');
    return `INV-${start.getUTCFullYear()}-${seq}`;
}
async function createInvoice(userId, clientId, input) {
    const uid = BigInt(userId);
    const cid = BigInt(clientId);
    const client = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!client)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    const items = input.items.map((it) => ({ ...it, taxRate: it.taxRate ?? 0 }));
    const totals = computeTotals(items);
    const number = input.number || (await generateInvoiceNumber(uid));
    const created = await prisma_js_1.prisma.invoice.create({
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
    const full = await prisma_js_1.prisma.invoice.findUnique({
        where: { id: created.id },
        include: { items: true, payments: true, events: true },
    });
    return toPublic(full, true);
}
async function listInvoicesByClient(userId, clientId, opts) {
    const uid = BigInt(userId);
    const cid = BigInt(clientId);
    const client = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!client)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    const { status, overdue, page, pageSize } = opts;
    const skip = (page - 1) * pageSize;
    const where = { clientId: cid };
    if (status)
        where.status = status;
    if (overdue === true)
        where.AND = [where.AND ?? [], { status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] }, dueDate: { lt: new Date() } }];
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.invoice.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.invoice.count({ where }),
    ]);
    return { items: items.map((i) => toPublic(i)), total, page, pageSize };
}
async function getInvoice(userId, id) {
    const uid = BigInt(userId);
    const iid = BigInt(id);
    const inv = await prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid }, include: { items: true, payments: true, events: true, client: true } });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    return toPublic(inv, true);
}
async function updateInvoice(userId, id, input) {
    const uid = BigInt(userId);
    const iid = BigInt(id);
    const inv = await prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    await prisma_js_1.prisma.$transaction(async (tx) => {
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
    const full = await prisma_js_1.prisma.invoice.findUnique({ where: { id: iid }, include: { items: true, payments: true, events: true } });
    return toPublic(full, true);
}
async function deleteInvoice(userId, id) {
    const uid = BigInt(userId);
    const iid = BigInt(id);
    const del = await prisma_js_1.prisma.invoice.deleteMany({ where: { id: iid, ownerId: uid } });
    if (del.count === 0)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
}
async function addPayment(userId, id, input) {
    const uid = BigInt(userId);
    const iid = BigInt(id);
    const inv = await prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    await prisma_js_1.prisma.payment.create({ data: { invoiceId: iid, amount: input.amount, method: input.method, reference: input.reference, receivedAt: input.receivedAt ?? new Date(), notes: input.notes } });
    await recalcInvoiceAggregates(iid);
    const full = await prisma_js_1.prisma.invoice.findUnique({ where: { id: iid }, include: { items: true, payments: true, events: true } });
    return toPublic(full, true);
}
async function removePayment(userId, invoiceId, paymentId) {
    const uid = BigInt(userId);
    const iid = BigInt(invoiceId);
    const pid = BigInt(paymentId);
    const inv = await prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    await prisma_js_1.prisma.payment.deleteMany({ where: { id: pid, invoiceId: iid } });
    await recalcInvoiceAggregates(iid);
}
async function markSent(userId, id) {
    const uid = BigInt(userId);
    const iid = BigInt(id);
    const inv = await prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    const updated = await prisma_js_1.prisma.invoice.update({ where: { id: iid }, data: { sentAt: inv.sentAt ?? new Date() } });
    if (!inv.sentAt) {
        await prisma_js_1.prisma.invoiceStatusEvent.create({ data: { invoiceId: iid, fromStatus: inv.status, toStatus: 'SENT', reason: 'marked-sent' } });
    }
    await recalcInvoiceAggregates(updated.id);
    const full = await prisma_js_1.prisma.invoice.findUnique({ where: { id: iid }, include: { items: true, payments: true, events: true } });
    return toPublic(full, true);
}
// ---------- PDF Generation ----------
const pdfkit_1 = __importDefault(require("pdfkit"));
async function getOwnerProfile(ownerId) {
    const [profile, user] = await Promise.all([
        prisma_js_1.prisma.ownerProfile.findUnique({ where: { ownerId } }),
        prisma_js_1.prisma.user.findUnique({ where: { id: ownerId } }),
    ]);
    return { profile, user };
}
function formatMoney(n, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n);
}
async function generateInvoicePdf(userId, id) {
    const uid = BigInt(userId);
    const iid = BigInt(id);
    const inv = await prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid }, include: { items: true, client: true, payments: true } });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    const { profile, user } = await getOwnerProfile(uid);
    const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
    const chunks = [];
    return await new Promise((resolve, reject) => {
        doc.on('data', (d) => chunks.push(d));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        // Header
        doc.fontSize(20).text('FACTURE', { align: 'right' });
        doc.moveDown();
        // Seller block
        doc.fontSize(12).text(profile?.companyName ?? 'Votre société');
        if (profile?.fullName || user?.fullName)
            doc.text(profile?.fullName ?? user?.fullName ?? '');
        if (profile?.addressLine1)
            doc.text(profile.addressLine1);
        if (profile?.addressLine2)
            doc.text(profile.addressLine2);
        const cityLine = [profile?.postalCode, profile?.city].filter(Boolean).join(' ');
        if (cityLine)
            doc.text(cityLine);
        if (profile?.country)
            doc.text(profile.country);
        if (profile?.email)
            doc.text(`Email: ${profile.email}`);
        if (profile?.phone)
            doc.text(`Téléphone: ${profile.phone}`);
        if (profile?.website)
            doc.text(`Site: ${profile.website}`);
        if (profile?.vatNumber)
            doc.text(`TVA: ${profile.vatNumber}`);
        if (profile?.registrationNumber)
            doc.text(`SIREN/SIRET: ${profile.registrationNumber}`);
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
        if (inv.client.email)
            doc.text(inv.client.email);
        if (inv.client.phone)
            doc.text(inv.client.phone);
        // Items table
        doc.moveDown();
        doc.fontSize(12).text('Détails', { underline: true });
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, doc.y, { continued: true });
        const colQty = 320, colUnit = 380, colTax = 450, colTotal = 520;
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
            doc.text(formatMoney(unit, inv.currency), colUnit, undefined, { width: 60, align: 'right', continued: true });
            doc.text(tva.toFixed(2), colTax, undefined, { width: 50, align: 'right', continued: true });
            doc.text(formatMoney(total, inv.currency), colTotal, undefined, { width: 70, align: 'right' });
        }
        doc.moveDown();
        // Totals
        const rightCol = 400;
        doc.text('Sous-total:', rightCol, doc.y, { continued: true });
        doc.text(formatMoney(Number(inv.subtotal), inv.currency), 500, undefined, { width: 90, align: 'right' });
        doc.text('TVA:', rightCol, doc.y, { continued: true });
        doc.text(formatMoney(Number(inv.taxTotal), inv.currency), 500, undefined, { width: 90, align: 'right' });
        doc.font('Helvetica-Bold');
        doc.text('Total:', rightCol, doc.y, { continued: true });
        doc.text(formatMoney(Number(inv.total), inv.currency), 500, undefined, { width: 90, align: 'right' });
        doc.font('Helvetica');
        doc.text('Déjà payé:', rightCol, doc.y, { continued: true });
        const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
        doc.text(formatMoney(paid, inv.currency), 500, undefined, { width: 90, align: 'right' });
        doc.text('Restant dû:', rightCol, doc.y, { continued: true });
        doc.text(formatMoney(Math.max(0, Number(inv.total) - paid), inv.currency), 500, undefined, { width: 90, align: 'right' });
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
async function clientInvoiceSummary(userId, clientId) {
    const uid = BigInt(userId);
    const cid = BigInt(clientId);
    const client = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!client)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    const now = new Date();
    const [total, unpaid, overdue, paid, anyPastOverdue] = await Promise.all([
        prisma_js_1.prisma.invoice.count({ where: { clientId: cid } }),
        prisma_js_1.prisma.invoice.count({ where: { clientId: cid, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } } }),
        prisma_js_1.prisma.invoice.count({ where: { clientId: cid, dueDate: { lt: now }, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } } }),
        prisma_js_1.prisma.invoice.count({ where: { clientId: cid, status: 'PAID' } }),
        prisma_js_1.prisma.invoiceStatusEvent.count({ where: { invoice: { clientId: cid }, toStatus: 'OVERDUE' } }),
    ]);
    return { total, unpaid, overdue, paid, hadPastOverdue: anyPastOverdue > 0 };
}
