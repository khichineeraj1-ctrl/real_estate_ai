import { GST, type CityCosts } from './finance';

/**
 * A builder's quote, normalised: what the home costs per square foot you can actually use (carpet area), and the
 * whole bill once every extra and government charge is added. Estimates, to compare quotes on the same footing.
 */
export interface Quote {
  name: string;
  /** The basic price quoted for the flat, in rupees. */
  base: number;
  /** The area the price was quoted on, usually "super built-up". */
  superArea: number;
  /** Carpet area if the builder gave it; 0 when not known, and it is then estimated from the loading. */
  carpetArea: number;
  parking: number; club: number; plc: number; deposit: number; other: number;
  underConstruction: boolean;
}
/** Typical share of super built-up area that is not carpet, used only when the carpet area is not known. */
export const TYPICAL_LOADING_PCT = 30;
export const blankQuote = (name: string): Quote => ({ name, base: 10_000_000, superArea: 1500, carpetArea: 0, parking: 300_000, club: 150_000, plc: 0, deposit: 100_000, other: 0, underConstruction: true });

export interface QuoteBill {
  carpet: number; carpetEstimated: boolean; loadingPct: number;
  extras: number; extrasPct: number;
  gst: number; stampDuty: number; registration: number; government: number;
  total: number;
  /** The rate the builder advertises, and the rate you really pay for usable floor, all charges in. */
  perSuperQuoted: number; perCarpetAllIn: number;
}

export function quoteBill(q: Quote, costs: CityCosts | null): QuoteBill {
  const carpetEstimated = !(q.carpetArea > 0);
  const carpet = carpetEstimated ? Math.round(q.superArea * (1 - TYPICAL_LOADING_PCT / 100)) : q.carpetArea;
  const loadingPct = q.superArea > 0 ? Math.max(0, Math.round((1 - carpet / q.superArea) * 100)) : 0;
  const extras = q.parking + q.club + q.plc + q.deposit + q.other;
  // Tax and duty fall on the price of the home and what is sold with it, not on a refundable deposit.
  const taxable = q.base + q.parking + q.club + q.plc + q.other;
  const gst = q.underConstruction ? Math.round((taxable * (q.base <= GST.affordableUpToInr ? GST.affordablePct : GST.pct)) / 100) : 0;
  const stampDuty = costs ? Math.round((taxable * costs.stampDutyPct) / 100) : 0;
  const reg = costs ? Math.round((taxable * costs.registrationPct) / 100) : 0;
  const registration = costs?.registrationCapInr != null ? Math.min(reg, costs.registrationCapInr) : reg;
  const government = gst + stampDuty + registration;
  const total = q.base + extras + government;
  return {
    carpet, carpetEstimated, loadingPct, extras, extrasPct: q.base > 0 ? Math.round((extras / q.base) * 100) : 0, gst, stampDuty, registration, government, total,
    perSuperQuoted: q.superArea > 0 ? Math.round(q.base / q.superArea) : 0, perCarpetAllIn: carpet > 0 ? Math.round(total / carpet) : 0,
  };
}

/** What a delay in possession costs: rent you keep paying, less the interest the builder owes you under RERA. */
export interface DelayCost { rent: number; interestOwed: number; net: number; perMonth: number }
export function delayCost(months: number, monthlyRent: number, paidSoFar: number, interestPct: number): DelayCost {
  const rent = Math.round(monthlyRent * months);
  const interestOwed = Math.round((paidSoFar * interestPct * months) / 1200);
  return { rent, interestOwed, net: rent - interestOwed, perMonth: months > 0 ? Math.round((rent - interestOwed) / months) : 0 };
}
