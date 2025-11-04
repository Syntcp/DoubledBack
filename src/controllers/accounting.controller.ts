import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { statusQuerySchema, contributionsQuerySchema, vatEstimateQuerySchema } from '../schemas/accounting.schema.js';
import { computeSocialContributions, estimateVat, findVatThresholdCrossingDate, getThresholdConfig, getVatContext, getYearRevenue } from '../services/tax.services.js';

export async function status(req: AuthRequest, res: Response) {
  const q = statusQuerySchema.parse(req.query);
  const now = new Date();
  const year = q.year ?? now.getUTCFullYear();
  const ctx = await getVatContext(req.user!.id, now);
  const rev = await getYearRevenue(req.user!.id, year, q.mode);
  const crossing = await findVatThresholdCrossingDate(req.user!.id, year, 'invoiced');
  res.json({
    year,
    mode: q.mode,
    thresholds: getThresholdConfig(),
    revenue: { total: rev.total },
    vat: {
      regime: ctx.regime,
      defaultVatRate: ctx.defaultVatRate,
      effectiveFrom: ctx.effectiveFrom,
      ytd: ctx.ytd,
      previousYear: ctx.previousYear,
      crossing,
      vatRegime: ctx.vatRegime,
      exigibility: ctx.exigibility,
      reason: ctx.reason,
    },
  });
}

export async function contributions(req: AuthRequest, res: Response) {
  const q = contributionsQuerySchema.parse(req.query);
  const now = new Date();
  const from = q.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = q.to ?? now;
  const out = await computeSocialContributions(req.user!.id, from, to, q.mode, {
    includeIncomeTax: q.includeIncomeTax,
    acre: q.acre,
    rateOverride: q.rateOverride,
  });
  res.json(out);
}

export async function vat(req: AuthRequest, res: Response) {
  const q = vatEstimateQuerySchema.parse(req.query);
  const now = new Date();
  const from = q.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = q.to ?? now;
  const out = await estimateVat(req.user!.id, from, to, q.strategy, q.rate, q.basis, {
    includeCreditNotes: q.includeCreditNotes,
    includeAdvances: q.includeAdvances,
  });
  res.json(out);
}
