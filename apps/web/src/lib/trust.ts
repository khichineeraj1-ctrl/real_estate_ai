/** Confidence: how far our team has verified a home or a seller. Levels come from the API with the reasons behind them. */
export interface Reason { ok: boolean; text: string }
export interface Confidence { level: number; label: string; reasons: Reason[] }
export const LEVELS = ['Not yet verified', 'Basic checks only', 'Good confidence', 'High confidence'];
export const levelLabel = (level: number | null | undefined) => LEVELS[level ?? 0] ?? LEVELS[0];

/** A seller's public card. Never includes contact details, documents or staff notes. */
export interface PublicDealer {
  id: string; name: string; since: string; confidence: Confidence;
  kind: 'OWNER' | 'AGENT' | 'BUILDER' | null; firmName: string | null; yearsInBusiness: number | null; cities: string[]; about: string | null;
}
/** What a buyer can report about a listing, in the order shown. */
export const REPORT_REASONS = [
  { value: 'ASKED_ADVANCE', label: 'I was asked to pay before visiting or seeing papers' },
  { value: 'FAKE_LISTING', label: 'This home does not exist or is not for sale' },
  { value: 'NOT_THE_OWNER', label: 'The seller is not the owner or has no right to sell' },
  { value: 'WRONG_DETAILS', label: 'The price, size, photos or status are not as listed' },
  { value: 'UNREACHABLE', label: 'The seller never answers, or was abusive' },
  { value: 'OTHER', label: 'Something else' },
] as const;
export const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

export const KIND_LABEL: Record<string, string> = { OWNER: 'Owner', AGENT: 'Agent', BUILDER: 'Builder' };
export const DOC_LABEL: Record<string, string> = { ID_PROOF: 'Identity document', RERA_CERTIFICATE: 'RERA certificate', BUSINESS_PROOF: 'Business document', OWNERSHIP_PROOF: 'Proof of ownership' };
