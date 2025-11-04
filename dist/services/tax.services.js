"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThresholdConfig = getThresholdConfig;
exports.getYearRevenue = getYearRevenue;
exports.findVatThresholdCrossingDate = findVatThresholdCrossingDate;
exports.getVatContext = getVatContext;
exports.computeSocialContributions = computeSocialContributions;
exports.estimateVat = estimateVat;
exports.resolveDefaultItemTaxRate = resolveDefaultItemTaxRate;
const prisma_js_1 = require("../lib/prisma.js");
const env_js_1 = require("../config/env.js");
function getThresholdConfig() {
    // Allow override via env while providing sane defaults
    const base = Number(env_js_1.env.TVA_FR_SERVICES_BASE ?? process.env.TVA_FR_SERVICES_BASE ?? 41250);
    const major = Number(env_js_1.env.TVA_FR_SERVICES_MAJOR ?? process.env.TVA_FR_SERVICES_MAJOR ?? 45500);
    const rate = Number(env_js_1.env.TVA_STANDARD_RATE ?? process.env.TVA_STANDARD_RATE ?? 20);
    const microBNC = Number(env_js_1.env.MICRO_BNC_RATE ?? process.env.MICRO_BNC_RATE ?? 0.246);
    const cfp = Number(env_js_1.env.CFP_RATE ?? process.env.CFP_RATE ?? 0.002);
    const exig = String(env_js_1.env.VAT_EXIGIBILITY ?? process.env.VAT_EXIGIBILITY ?? 'payments');
    const vatOption = String(env_js_1.env.VAT_OPTION_ENABLED ?? process.env.VAT_OPTION_ENABLED ?? 'false') === 'true';
    const acreFactor = env_js_1.env.ACRE_REDUCTION_FACTOR ?? process.env.ACRE_REDUCTION_FACTOR;
    const incomeTaxRate = env_js_1.env.INCOME_TAX_RATE ?? process.env.INCOME_TAX_RATE;
    return {
        servicesBase: base,
        servicesMajor: major,
        defaultVatRate: rate,
        socialRates: { microBNC, cfp },
        exigibility: exig === 'invoices' ? 'invoices' : 'payments',
        options: {
            vatOptionEnabled: vatOption,
            acreReductionFactor: acreFactor != null ? Number(acreFactor) : undefined,
            incomeTaxRate: incomeTaxRate != null ? Number(incomeTaxRate) : undefined,
        },
    };
}
async function getYearRevenue(userId, year, mode = 'paid') {
    const uid = BigInt(userId);
    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    if (mode === 'paid') {
        const payments = await prisma_js_1.prisma.payment.findMany({
            where: { invoice: { ownerId: uid }, receivedAt: { gte: from, lte: to } },
            select: { amount: true, receivedAt: true },
            orderBy: { receivedAt: 'asc' },
        });
        const rows = payments.map((p) => ({ date: p.receivedAt, amount: Number(p.amount?.toString?.() ?? p.amount ?? 0) }));
        const total = rows.reduce((s, r) => s + r.amount, 0);
        return { total, rows };
    }
    else {
        const invoices = await prisma_js_1.prisma.invoice.findMany({
            where: { ownerId: uid, issueDate: { gte: from, lte: to } },
            select: { total: true, issueDate: true },
            orderBy: { issueDate: 'asc' },
        });
        const rows = invoices.map((i) => ({ date: i.issueDate, amount: Number(i.total?.toString?.() ?? i.total ?? 0) }));
        const total = rows.reduce((s, r) => s + r.amount, 0);
        return { total, rows };
    }
}
async function findVatThresholdCrossingDate(userId, year, mode = 'invoiced') {
    const cfg = getThresholdConfig();
    const { rows } = await getYearRevenue(userId, year, mode);
    let acc = 0;
    for (const r of rows) {
        acc += r.amount;
        if (acc > cfg.servicesMajor) {
            // Effective from first day of month of crossing (practical simplification)
            const d = new Date(r.date);
            const effectiveFrom = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
            return { crossingAmount: acc, crossingAt: r.date, effectiveFrom };
        }
    }
    return null;
}
async function getVatContext(userId, at) {
    const year = at.getUTCFullYear();
    const prevYear = year - 1;
    const cfg = getThresholdConfig();
    // Use invoiced mode for regime determination (simpler/common)
    const prev = await getYearRevenue(userId, prevYear, 'invoiced');
    const ytd = await getYearRevenue(userId, year, 'invoiced');
    const crossing = await findVatThresholdCrossingDate(userId, year, 'invoiced');
    let regime = 'FRANCHISE';
    let effectiveFrom = null;
    let reason = null;
    // Heuristics aligned with practice: if YTD > major => VAT from month of crossing
    if (crossing) {
        regime = 'VAT';
        effectiveFrom = crossing.effectiveFrom;
        reason = 'seuil_majoré';
    }
    else if (prev.total > cfg.servicesBase) {
        // Previous year above base -> VAT for current year (simplified)
        regime = 'VAT';
        effectiveFrom = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        reason = 'N-1';
    }
    else if (cfg.options.vatOptionEnabled) {
        regime = 'VAT';
        effectiveFrom = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        reason = 'option';
    }
    return {
        regime,
        effectiveFrom,
        ytd: ytd.total,
        previousYear: prev.total,
        thresholds: { base: cfg.servicesBase, major: cfg.servicesMajor },
        defaultVatRate: cfg.defaultVatRate,
        vatRegime: regime === 'VAT' ? 'assujetti' : 'franchise',
        exigibility: cfg.exigibility === 'payments' ? 'encaissements' : 'débits',
        reason,
    };
}
function round2(n) { return Math.round(n * 100) / 100; }
async function computeSocialContributions(userId, from, to, mode = 'paid', opts) {
    const cfg = getThresholdConfig();
    const uid = BigInt(userId);
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    // Revenue
    let revenue = 0;
    if (mode === 'paid') {
        const payments = await prisma_js_1.prisma.payment.findMany({
            where: { invoice: { ownerId: uid }, receivedAt: { gte: fromStart, lte: toEnd } },
            select: { amount: true },
        });
        revenue = payments.reduce((s, p) => s + Number(p.amount?.toString?.() ?? p.amount ?? 0), 0);
    }
    else {
        const invoices = await prisma_js_1.prisma.invoice.findMany({
            where: { ownerId: uid, issueDate: { gte: fromStart, lte: toEnd } },
            select: { total: true },
        });
        revenue = invoices.reduce((s, i) => s + Number(i.total?.toString?.() ?? i.total ?? 0), 0);
    }
    const baseRate = opts?.rateOverride ?? (cfg.socialRates.microBNC * (opts?.acre && cfg.options.acreReductionFactor ? cfg.options.acreReductionFactor : 1));
    const socialDueRaw = revenue * baseRate;
    const cfpDueRaw = revenue * cfg.socialRates.cfp;
    const socialDue = round2(socialDueRaw);
    const cfpDue = round2(cfpDueRaw);
    const totalDue = round2(socialDue + cfpDue);
    const totalDueRounded = Math.round(totalDue); // à l'euro
    // Optional prélèvement libératoire simulation
    let incomeTaxIfOpted = undefined;
    if (opts?.includeIncomeTax && cfg.options.incomeTaxRate != null) {
        incomeTaxIfOpted = round2(revenue * cfg.options.incomeTaxRate);
    }
    return {
        from: fromStart,
        to: toEnd,
        mode,
        baseRevenue: revenue,
        rates: { social: baseRate, cfp: cfg.socialRates.cfp },
        socialDue,
        cfpDue,
        totalDue,
        totalDueRounded,
        incomeTaxIfOpted,
    };
}
async function estimateVat(userId, from, to, strategy = 'actual', overrideRate, basis = 'payments', opts) {
    const uid = BigInt(userId);
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    const cfg = getThresholdConfig();
    const details = [];
    let vat = 0;
    if (basis === 'invoices') {
        const invoices = await prisma_js_1.prisma.invoice.findMany({
            where: { ownerId: uid, issueDate: { gte: fromStart, lte: toEnd } },
            include: { items: true },
        });
        if (strategy === 'actual') {
            for (const inv of invoices) {
                let invVat = 0, invBase = 0;
                for (const it of inv.items) {
                    const qty = Number(it.quantity ?? 1);
                    const price = Number(it.unitPrice ?? 0);
                    const rate = Number(it.taxRate ?? 0) / 100;
                    const subtotal = qty * price;
                    invBase += subtotal;
                    invVat += subtotal * rate;
                }
                vat += invVat;
                details.push({ type: 'invoice', invoiceId: Number(inv.id), number: inv.number, date: inv.issueDate, base: round2(invBase), vat: round2(invVat) });
            }
        }
        else {
            const rate = (overrideRate ?? cfg.defaultVatRate) / 100;
            for (const inv of invoices) {
                const items = inv.items ?? [];
                let subtotal = 0;
                for (const it of items) {
                    const qty = Number(it.quantity ?? 1);
                    const price = Number(it.unitPrice ?? 0);
                    subtotal += qty * price;
                }
                const invVat = subtotal * rate;
                vat += invVat;
                details.push({ type: 'invoice', invoiceId: Number(inv.id), number: inv.number, date: inv.issueDate, base: round2(subtotal), vat: round2(invVat) });
            }
        }
    }
    else {
        // payments basis: VAT exigible à l'encaissement (prestations)
        const invoices = await prisma_js_1.prisma.invoice.findMany({
            where: { ownerId: uid },
            include: { items: true, payments: true },
        });
        const rateStd = (overrideRate ?? cfg.defaultVatRate) / 100;
        for (const inv of invoices) {
            const invTotal = Number(inv.total ?? 0);
            const invTaxTotal = Number(inv.taxTotal?.toString?.() ?? inv.taxTotal ?? 0);
            let invVatRatio;
            if (strategy === 'actual') {
                const computed = inv.items.reduce((acc, it) => {
                    const qty = Number(it.quantity ?? 1);
                    const price = Number(it.unitPrice ?? 0);
                    const rate = Number(it.taxRate ?? 0) / 100;
                    const subtotal = qty * price;
                    acc.base += subtotal;
                    acc.vat += subtotal * rate;
                    return acc;
                }, { base: 0, vat: 0 });
                invVatRatio = computed.base > 0 ? computed.vat / (computed.base + computed.vat) : (invTotal > 0 ? invTaxTotal / invTotal : 0);
            }
            else {
                invVatRatio = invTotal > 0 ? rateStd / (1 + rateStd) : 0;
            }
            for (const p of inv.payments ?? []) {
                const dt = p.receivedAt;
                if (dt < fromStart || dt > toEnd)
                    continue;
                const amount = Number(p.amount?.toString?.() ?? p.amount ?? 0);
                const vatPart = round2(amount * invVatRatio);
                vat += vatPart;
                details.push({ type: 'payment', invoiceId: Number(inv.id), number: inv.number, paymentId: Number(p.id), date: dt, amount: round2(amount), vat: vatPart, method: p.method });
            }
        }
    }
    return { from: fromStart, to: toEnd, strategy, basis, vat: round2(vat), details };
}
async function resolveDefaultItemTaxRate(userId, at) {
    const ctx = await getVatContext(userId, at);
    return ctx.regime === 'VAT' ? ctx.defaultVatRate : 0;
}
