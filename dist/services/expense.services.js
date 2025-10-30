"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpenses = listExpenses;
exports.createExpense = createExpense;
exports.updateExpense = updateExpense;
exports.removeExpense = removeExpense;
exports.linkInvoiceToExpense = linkInvoiceToExpense;
exports.unlinkInvoiceFromExpense = unlinkInvoiceFromExpense;
exports.financeSummary = financeSummary;
// @ts-nocheck
const prisma_js_1 = require("../lib/prisma.js");
function toNum(n) { return Number(typeof n === 'object' && n != null && 'toString' in n ? n.toString() : n ?? 0); }
function toPublic(e) {
    return {
        id: Number(e.id),
        vendor: e.vendor,
        description: e.description ?? null,
        amount: toNum(e.amount),
        currency: e.currency,
        frequency: e.frequency,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        isActive: Boolean(e.isActive),
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        links: (e.invoiceLinks ?? []).map((l) => ({ invoiceId: Number(l.invoiceId), allocated: toNum(l.allocated) || null, createdAt: l.createdAt })),
    };
}
async function listExpenses(userId, q) {
    const uid = BigInt(userId);
    const where = { ownerId: uid };
    if (q.active !== undefined)
        where.isActive = q.active;
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.expense.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { invoiceLinks: true } }),
        prisma_js_1.prisma.expense.count({ where }),
    ]);
    return { items: items.map(toPublic), total, page: q.page, pageSize: q.pageSize };
}
async function createExpense(userId, input) {
    const uid = BigInt(userId);
    const out = await prisma_js_1.prisma.expense.create({ data: { ownerId: uid, vendor: input.vendor, description: input.description, amount: input.amount, currency: input.currency ?? 'EUR', frequency: input.frequency ?? 'ONE_OFF', startDate: input.startDate ?? new Date(), endDate: input.endDate, isActive: input.isActive ?? true } });
    return toPublic(out);
}
async function updateExpense(userId, id, input) {
    const uid = BigInt(userId);
    const eid = BigInt(id);
    const updated = await prisma_js_1.prisma.expense.updateMany({ where: { id: eid, ownerId: uid }, data: input });
    if (updated.count === 0)
        throw Object.assign(new Error('Dépense introuvable'), { status: 404 });
    const out = await prisma_js_1.prisma.expense.findUnique({ where: { id: eid }, include: { invoiceLinks: true } });
    return toPublic(out);
}
async function removeExpense(userId, id) {
    const uid = BigInt(userId);
    const eid = BigInt(id);
    const del = await prisma_js_1.prisma.expense.deleteMany({ where: { id: eid, ownerId: uid } });
    if (del.count === 0)
        throw Object.assign(new Error('Dépense introuvable'), { status: 404 });
}
async function linkInvoiceToExpense(userId, id, invoiceId, allocated) {
    const uid = BigInt(userId);
    const eid = BigInt(id);
    const iid = BigInt(invoiceId);
    const [exp, inv] = await Promise.all([
        prisma_js_1.prisma.expense.findFirst({ where: { id: eid, ownerId: uid } }),
        prisma_js_1.prisma.invoice.findFirst({ where: { id: iid, ownerId: uid } }),
    ]);
    if (!exp)
        throw Object.assign(new Error('Dépense introuvable'), { status: 404 });
    if (!inv)
        throw Object.assign(new Error('Facture introuvable'), { status: 404 });
    await prisma_js_1.prisma.expenseInvoiceLink.upsert({
        where: { expenseId_invoiceId: { expenseId: eid, invoiceId: iid } },
        update: { allocated: allocated },
        create: { expenseId: eid, invoiceId: iid, allocated: allocated },
    });
    const out = await prisma_js_1.prisma.expense.findUnique({ where: { id: eid }, include: { invoiceLinks: true } });
    return toPublic(out);
}
async function unlinkInvoiceFromExpense(userId, id, invoiceId) {
    const uid = BigInt(userId);
    const eid = BigInt(id);
    const iid = BigInt(invoiceId);
    const exp = await prisma_js_1.prisma.expense.findFirst({ where: { id: eid, ownerId: uid } });
    if (!exp)
        throw Object.assign(new Error('Dépense introuvable'), { status: 404 });
    await prisma_js_1.prisma.expenseInvoiceLink.deleteMany({ where: { expenseId: eid, invoiceId: iid } });
}
// Finance summary
function addMonths(d, months) {
    const nd = new Date(d.getTime());
    nd.setMonth(nd.getMonth() + months);
    return nd;
}
function addDays(d, days) {
    const nd = new Date(d.getTime());
    nd.setDate(nd.getDate() + days);
    return nd;
}
function nextByFreq(d, freq) {
    switch (freq) {
        case 'DAILY': return addDays(d, 1);
        case 'WEEKLY': return addDays(d, 7);
        case 'MONTHLY': return addMonths(d, 1);
        case 'QUARTERLY': return addMonths(d, 3);
        case 'ANNUAL': return addMonths(d, 12);
        case 'ONE_OFF':
        default: return addMonths(d, 1200); // far future
    }
}
function countOccurrencesInRange(freq, start, end, from, to) {
    const rangeStart = from > start ? from : start;
    const until = (end && end < to) ? end : to;
    if (rangeStart > until)
        return 0;
    if (freq === 'ONE_OFF')
        return (start >= from && start <= to) ? 1 : 0;
    let c = 0;
    let cur = new Date(start.getTime());
    // advance to first occurrence >= rangeStart
    while (cur < rangeStart) {
        const nxt = nextByFreq(cur, freq);
        if (nxt.getTime() === cur.getTime())
            break;
        cur = nxt;
        if (end && cur > end)
            break;
    }
    while (cur <= until) {
        c++;
        const nxt = nextByFreq(cur, freq);
        if (nxt.getTime() === cur.getTime())
            break;
        cur = nxt;
        if (end && cur > end)
            break;
    }
    return c;
}
async function financeSummary(userId, args) {
    const uid = BigInt(userId);
    const rawFrom = args.from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const rawTo = args.to ?? new Date();
    const fromStart = new Date(rawFrom);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(rawTo);
    toEnd.setHours(23, 59, 59, 999);
    // Revenue
    const [payments, invoices] = await Promise.all([
        prisma_js_1.prisma.payment.findMany({
            where: { invoice: { ownerId: uid }, receivedAt: { gte: fromStart, lte: toEnd } },
            select: { amount: true },
        }),
        prisma_js_1.prisma.invoice.findMany({ where: { ownerId: uid, issueDate: { gte: fromStart, lte: toEnd } }, select: { total: true, status: true } }),
    ]);
    const totalPaid = payments.reduce((s, p) => s + toNum(p.amount), 0);
    const totalInvoiced = invoices.reduce((s, i) => s + toNum(i.total), 0);
    const revenue = (args.mode ?? 'paid') === 'paid' ? totalPaid : totalInvoiced;
    // Expenses
    const exps = await prisma_js_1.prisma.expense.findMany({ where: { ownerId: uid, isActive: true, startDate: { lte: toEnd } } });
    const totalExpenses = exps.reduce((s, e) => {
        const count = countOccurrencesInRange(e.frequency, e.startDate, e.endDate ?? null, fromStart, toEnd);
        return s + count * toNum(e.amount);
    }, 0);
    return {
        fromStart,
        toEnd,
        mode: args.mode ?? 'paid',
        revenue,
        expenses: totalExpenses,
        net: revenue - totalExpenses,
    };
}
