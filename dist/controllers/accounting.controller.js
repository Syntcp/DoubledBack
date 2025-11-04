"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.status = status;
exports.contributions = contributions;
exports.vat = vat;
const accounting_schema_js_1 = require("../schemas/accounting.schema.js");
const tax_services_js_1 = require("../services/tax.services.js");
async function status(req, res) {
    const q = accounting_schema_js_1.statusQuerySchema.parse(req.query);
    const now = new Date();
    const year = q.year ?? now.getUTCFullYear();
    const ctx = await (0, tax_services_js_1.getVatContext)(req.user.id, now);
    const rev = await (0, tax_services_js_1.getYearRevenue)(req.user.id, year, q.mode);
    const crossing = await (0, tax_services_js_1.findVatThresholdCrossingDate)(req.user.id, year, 'invoiced');
    res.json({
        year,
        mode: q.mode,
        thresholds: (0, tax_services_js_1.getThresholdConfig)(),
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
async function contributions(req, res) {
    const q = accounting_schema_js_1.contributionsQuerySchema.parse(req.query);
    const now = new Date();
    const from = q.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = q.to ?? now;
    const out = await (0, tax_services_js_1.computeSocialContributions)(req.user.id, from, to, q.mode, {
        includeIncomeTax: q.includeIncomeTax,
        acre: q.acre,
        rateOverride: q.rateOverride,
    });
    res.json(out);
}
async function vat(req, res) {
    const q = accounting_schema_js_1.vatEstimateQuerySchema.parse(req.query);
    const now = new Date();
    const from = q.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = q.to ?? now;
    const out = await (0, tax_services_js_1.estimateVat)(req.user.id, from, to, q.strategy, q.rate, q.basis, {
        includeCreditNotes: q.includeCreditNotes,
        includeAdvances: q.includeAdvances,
    });
    res.json(out);
}
