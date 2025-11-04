import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export type VatRegime = 'FRANCHISE' | 'VAT';

export type ThresholdConfig = {
  servicesBase: number; // seuil base franchise (prestations de service)
  servicesMajor: number; // seuil majoré (dépassement -> TVA immédiate)
  defaultVatRate: number; // en % (ex: 20)
  socialRates: {
    microBNC: number; // ex: 0.246 (24.6%)
    cfp: number; // contribution formation pro (ex: 0.002)
  };
  exigibility: 'payments' | 'invoices'; // prestations de services: encaissements
  options: {
    vatOptionEnabled: boolean; // option volontaire pour la TVA
    acreReductionFactor?: number; // 0.5 -> 50% la 1ère année (simplifié)
    incomeTaxRate?: number; // prélèvement libératoire (ex: 0.022)
  };
};

export function getThresholdConfig(): ThresholdConfig {
  // Allow override via env while providing sane defaults
  const base = Number((env as any).TVA_FR_SERVICES_BASE ?? process.env.TVA_FR_SERVICES_BASE ?? 41250);
  const major = Number((env as any).TVA_FR_SERVICES_MAJOR ?? process.env.TVA_FR_SERVICES_MAJOR ?? 45500);
  const rate = Number((env as any).TVA_STANDARD_RATE ?? process.env.TVA_STANDARD_RATE ?? 20);
  const microBNC = Number((env as any).MICRO_BNC_RATE ?? process.env.MICRO_BNC_RATE ?? 0.246);
  const cfp = Number((env as any).CFP_RATE ?? process.env.CFP_RATE ?? 0.002);
  const exig = String((env as any).VAT_EXIGIBILITY ?? process.env.VAT_EXIGIBILITY ?? 'payments');
  const vatOption = String((env as any).VAT_OPTION_ENABLED ?? process.env.VAT_OPTION_ENABLED ?? 'false') === 'true';
  const acreFactor = (env as any).ACRE_REDUCTION_FACTOR ?? process.env.ACRE_REDUCTION_FACTOR;
  const incomeTaxRate = (env as any).INCOME_TAX_RATE ?? process.env.INCOME_TAX_RATE;
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

export async function getYearRevenue(userId: number, year: number, mode: 'paid' | 'invoiced' = 'paid') {
  const uid = BigInt(userId);
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  if (mode === 'paid') {
    const payments = await prisma.payment.findMany({
      where: { invoice: { ownerId: uid }, receivedAt: { gte: from, lte: to } },
      select: { amount: true, receivedAt: true },
      orderBy: { receivedAt: 'asc' },
    });
    const rows = payments.map((p) => ({ date: p.receivedAt, amount: Number((p.amount as any)?.toString?.() ?? p.amount ?? 0) }));
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { total, rows };
  } else {
    const invoices = await prisma.invoice.findMany({
      where: { ownerId: uid, issueDate: { gte: from, lte: to } },
      select: { total: true, issueDate: true },
      orderBy: { issueDate: 'asc' },
    });
    const rows = invoices.map((i) => ({ date: i.issueDate, amount: Number((i.total as any)?.toString?.() ?? i.total ?? 0) }));
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { total, rows };
  }
}

export async function findVatThresholdCrossingDate(userId: number, year: number, mode: 'paid' | 'invoiced' = 'invoiced') {
  const cfg = getThresholdConfig();
  const { rows } = await getYearRevenue(userId, year, mode);
  let acc = 0;
  for (const r of rows) {
    acc += r.amount;
    if (acc > cfg.servicesMajor) {
      // Effective from first day of month of crossing (practical simplification)
      const d = new Date(r.date);
      const effectiveFrom = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
      return { crossingAmount: acc, crossingAt: r.date, effectiveFrom } as const;
    }
  }
  return null;
}

export async function getVatContext(userId: number, at: Date) {
  const year = at.getUTCFullYear();
  const prevYear = year - 1;
  const cfg = getThresholdConfig();

  // Use invoiced mode for regime determination (simpler/common)
  const prev = await getYearRevenue(userId, prevYear, 'invoiced');
  const ytd = await getYearRevenue(userId, year, 'invoiced');
  const crossing = await findVatThresholdCrossingDate(userId, year, 'invoiced');

  let regime: VatRegime = 'FRANCHISE';
  let effectiveFrom: Date | null = null;
  let reason: 'N-1' | 'seuil_majoré' | 'option' | null = null;

  // Heuristics aligned with practice: if YTD > major => VAT from month of crossing
  if (crossing) {
    regime = 'VAT';
    effectiveFrom = crossing.effectiveFrom;
    reason = 'seuil_majoré';
  } else if (prev.total > cfg.servicesBase) {
    // Previous year above base -> VAT for current year (simplified)
    regime = 'VAT';
    effectiveFrom = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    reason = 'N-1';
  } else if (cfg.options.vatOptionEnabled) {
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
  } as const;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export async function computeSocialContributions(
  userId: number,
  from: Date,
  to: Date,
  mode: 'paid' | 'invoiced' = 'paid',
  opts?: { includeIncomeTax?: boolean; acre?: boolean; rateOverride?: number },
) {
  const cfg = getThresholdConfig();
  const uid = BigInt(userId);
  const fromStart = new Date(from); fromStart.setHours(0, 0, 0, 0);
  const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);

  // Revenue
  let revenue = 0;
  if (mode === 'paid') {
    const payments = await prisma.payment.findMany({
      where: { invoice: { ownerId: uid }, receivedAt: { gte: fromStart, lte: toEnd } },
      select: { amount: true },
    });
    revenue = payments.reduce((s, p) => s + Number((p.amount as any)?.toString?.() ?? p.amount ?? 0), 0);
  } else {
    const invoices = await prisma.invoice.findMany({
      where: { ownerId: uid, issueDate: { gte: fromStart, lte: toEnd } },
      select: { total: true },
    });
    revenue = invoices.reduce((s, i) => s + Number((i.total as any)?.toString?.() ?? i.total ?? 0), 0);
  }

  const baseRate = opts?.rateOverride ?? (cfg.socialRates.microBNC * (opts?.acre && cfg.options.acreReductionFactor ? cfg.options.acreReductionFactor : 1));
  const socialDueRaw = revenue * baseRate;
  const cfpDueRaw = revenue * cfg.socialRates.cfp;
  const socialDue = round2(socialDueRaw);
  const cfpDue = round2(cfpDueRaw);
  const totalDue = round2(socialDue + cfpDue);
  const totalDueRounded = Math.round(totalDue); // à l'euro

  // Optional prélèvement libératoire simulation
  let incomeTaxIfOpted: number | undefined = undefined;
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

export async function estimateVat(
  userId: number,
  from: Date,
  to: Date,
  strategy: 'actual' | 'standard' = 'actual',
  overrideRate?: number,
  basis: 'payments' | 'invoices' = 'payments',
  opts?: { includeCreditNotes?: boolean; includeAdvances?: boolean },
) {
  const uid = BigInt(userId);
  const fromStart = new Date(from); fromStart.setHours(0, 0, 0, 0);
  const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
  const cfg = getThresholdConfig();

  const details: Array<any> = [];
  let vat = 0;

  if (basis === 'invoices') {
    const invoices = await prisma.invoice.findMany({
      where: { ownerId: uid, issueDate: { gte: fromStart, lte: toEnd } },
      include: { items: true },
    });
    if (strategy === 'actual') {
      for (const inv of invoices) {
        let invVat = 0, invBase = 0;
        for (const it of inv.items) {
          const qty = Number((it as any).quantity ?? 1);
          const price = Number((it as any).unitPrice ?? 0);
          const rate = Number((it as any).taxRate ?? 0) / 100;
          const subtotal = qty * price;
          invBase += subtotal;
          invVat += subtotal * rate;
        }
        vat += invVat;
        details.push({ type: 'invoice', invoiceId: Number((inv as any).id), number: (inv as any).number, date: (inv as any).issueDate, base: round2(invBase), vat: round2(invVat) });
      }
    } else {
      const rate = (overrideRate ?? cfg.defaultVatRate) / 100;
      for (const inv of invoices) {
        const items = inv.items ?? [];
        let subtotal = 0;
        for (const it of items) {
          const qty = Number((it as any).quantity ?? 1);
          const price = Number((it as any).unitPrice ?? 0);
          subtotal += qty * price;
        }
        const invVat = subtotal * rate;
        vat += invVat;
        details.push({ type: 'invoice', invoiceId: Number((inv as any).id), number: (inv as any).number, date: (inv as any).issueDate, base: round2(subtotal), vat: round2(invVat) });
      }
    }
  } else {
    // payments basis: VAT exigible à l'encaissement (prestations)
    const invoices = await prisma.invoice.findMany({
      where: { ownerId: uid },
      include: { items: true, payments: true },
    });
    const rateStd = (overrideRate ?? cfg.defaultVatRate) / 100;
    for (const inv of invoices) {
      const invTotal = Number((inv as any).total ?? 0);
      const invTaxTotal = Number(((inv as any).taxTotal as any)?.toString?.() ?? (inv as any).taxTotal ?? 0);
      let invVatRatio: number;
      if (strategy === 'actual') {
        const computed = inv.items.reduce((acc, it: any) => {
          const qty = Number((it as any).quantity ?? 1);
          const price = Number((it as any).unitPrice ?? 0);
          const rate = Number((it as any).taxRate ?? 0) / 100;
          const subtotal = qty * price;
          acc.base += subtotal;
          acc.vat += subtotal * rate;
          return acc;
        }, { base: 0, vat: 0 });
        invVatRatio = computed.base > 0 ? computed.vat / (computed.base + computed.vat) : (invTotal > 0 ? invTaxTotal / invTotal : 0);
      } else {
        invVatRatio = invTotal > 0 ? rateStd / (1 + rateStd) : 0;
      }

      for (const p of (inv as any).payments ?? []) {
        const dt = (p as any).receivedAt as Date;
        if (dt < fromStart || dt > toEnd) continue;
        const amount = Number(((p as any).amount as any)?.toString?.() ?? (p as any).amount ?? 0);
        const vatPart = round2(amount * invVatRatio);
        vat += vatPart;
        details.push({ type: 'payment', invoiceId: Number((inv as any).id), number: (inv as any).number, paymentId: Number((p as any).id), date: dt, amount: round2(amount), vat: vatPart, method: (p as any).method });
      }
    }
  }

  return { from: fromStart, to: toEnd, strategy, basis, vat: round2(vat), details };
}

export async function resolveDefaultItemTaxRate(userId: number, at: Date) {
  const ctx = await getVatContext(userId, at);
  return ctx.regime === 'VAT' ? ctx.defaultVatRate : 0;
}
