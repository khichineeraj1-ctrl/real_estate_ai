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
export const KIND_LABEL: Record<string, string> = { OWNER: 'Owner', AGENT: 'Agent', BUILDER: 'Builder' };
export const DOC_LABEL: Record<string, string> = { ID_PROOF: 'Identity document', RERA_CERTIFICATE: 'RERA certificate', BUSINESS_PROOF: 'Business document', OWNERSHIP_PROOF: 'Proof of ownership' };
