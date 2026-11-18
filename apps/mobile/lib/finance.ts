/**
 * A copy of apps/web/src/lib/finance.ts, so the app and the site give the same figures. Keep the two in step.
 */
/** Money maths for the buyer tools. Pure functions, used on the server for the first render and in the browser as people type. */

/**
 * Starting values for the calculators. The interest rate is an example, not a quote: lenders' rates move and depend
 * on the borrower, so every screen says so and lets the buyer change it.
 */
export const LOAN_DEFAULTS = { ratePct: 8.75, years: 20, downPct: 20, incomeSharePct: 45 };

/** GST on a home bought before it is complete, as a share of the price. Ready homes with a completion certificate have none. */
export const GST = { pct: 5, affordablePct: 1, affordableUpToInr: 4_500_000 };

/** Monthly instalment on a loan repaid in equal instalments. */
export function emi(principal: number, annualPct: number, years: number): number {
  const n = Math.round(years * 12);
  if (!(principal > 0) || n <= 0) return 0;
  const r = annualPct / 12 / 100;
  if (r <= 0) return principal / n;
  const f = (1 + r) ** n;
  return (principal * r * f) / (f - 1);
}

/** The largest loan a given monthly instalment can repay: the reverse of emi(). */
export function loanFor(monthly: number, annualPct: number, years: number): number {
  const n = Math.round(years * 12);
  if (!(monthly > 0) || n <= 0) return 0;
  const r = annualPct / 12 / 100;
  if (r <= 0) return monthly * n;
  return (monthly * (1 - (1 + r) ** -n)) / r;
}

export interface LoanPlan { loan: number; downPayment: number; monthly: number; interest: number; totalPaid: number }
export function loanPlan(price: number, downPct: number, annualPct: number, years: number): LoanPlan {
  const downPayment = Math.round((price * Math.min(Math.max(downPct, 0), 100)) / 100);
  const loan = Math.max(price - downPayment, 0);
  const monthly = emi(loan, annualPct, years);
  const totalPaid = monthly * Math.round(years * 12);
  return { loan, downPayment, monthly: Math.round(monthly), interest: Math.round(Math.max(totalPaid - loan, 0)), totalPaid: Math.round(totalPaid) };
}

export interface Affordability { spare: number; loan: number; budget: number }
/**
 * What a household can afford: lenders usually let all loan instalments together take up to a share of take-home pay
 * (45% here, adjustable). The budget is the loan that share can repay, plus savings for the down payment.
 */
export function affordability(monthlyIncome: number, otherEmis: number, savings: number, annualPct: number, years: number, incomeSharePct = LOAN_DEFAULTS.incomeSharePct): Affordability {
  const spare = Math.max((monthlyIncome * incomeSharePct) / 100 - otherEmis, 0);
  const loan = Math.round(loanFor(spare, annualPct, years));
  return { spare: Math.round(spare), loan, budget: loan + Math.max(Math.round(savings), 0) };
}

/** A city's government charges, as the API sends them. Percentages of the price. */
export interface CityCosts { stampDutyPct: number; stampDutyWomenPct: number; registrationPct: number; registrationCapInr: number | null; note: string | null; reviewedAt: string | null }

export interface BuyingCosts { stampDuty: number; stampDutyPct: number; registration: number; gst: number; gstPct: number; charges: number; total: number }
/** Government charges on top of the listed price. An estimate: duty is really charged on the higher of the price and the official circle rate. */
export function buyingCosts(price: number, costs: CityCosts, opts: { woman?: boolean; underConstruction?: boolean } = {}): BuyingCosts {
  const stampDutyPct = opts.woman ? costs.stampDutyWomenPct : costs.stampDutyPct;
  const stampDuty = Math.round((price * stampDutyPct) / 100);
  const uncapped = Math.round((price * costs.registrationPct) / 100);
  const registration = costs.registrationCapInr != null ? Math.min(uncapped, costs.registrationCapInr) : uncapped;
  const gstPct = opts.underConstruction ? (price <= GST.affordableUpToInr ? GST.affordablePct : GST.pct) : 0;
  const gst = Math.round((price * gstPct) / 100);
  const charges = stampDuty + registration + gst;
  return { stampDuty, stampDutyPct, registration, gst, gstPct, charges, total: price + charges };
}
