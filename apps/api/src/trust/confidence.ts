/**
 * The confidence rules. Pure functions: facts in, a level and the reasons for it out.
 *
 * One principle runs through all of it: only things a member of our staff actually confirmed can raise confidence.
 * What a seller says about themselves counts for nothing until someone has checked it, and every level comes with the
 * list of what was and was not checked, so a buyer can see what the label is resting on.
 */

export type Level = 0 | 1 | 2 | 3;
export const LEVEL_LABEL: Record<Level, string> = { 3: 'High confidence', 2: 'Good confidence', 1: 'Basic checks only', 0: 'Not yet verified' };

/** One line of the explanation. `ok` true means this counted in the home's or dealer's favour. */
export interface Reason { ok: boolean; text: string }
export interface Confidence { level: Level; label: string; reasons: Reason[] }

export interface DealerFacts {
  kind: 'OWNER' | 'AGENT' | 'BUILDER';
  approved: boolean;
  checkIdentity: boolean;
  /** RERA registration confirmed on the state site; for an owner, ownership papers seen. */
  checkRera: boolean;
  checkPhone: boolean;
  checkAddress: boolean;
  complaints: number;
  /** Enquiries on their listings that are more than two days old, and how many of those they have followed up. */
  oldLeads: number;
  oldLeadsFollowedUp: number;
  listings: number;
  listingsRejected: number;
}

const result = (level: Level, reasons: Reason[]): Confidence => ({ level, label: LEVEL_LABEL[level], reasons });

export function dealerConfidence(d: DealerFacts): Confidence {
  const proof = d.kind === 'OWNER' ? 'Ownership papers seen by our team' : 'RERA registration checked on the state register';
  const noProof = d.kind === 'OWNER' ? 'Ownership papers not yet seen by our team' : 'RERA registration not yet checked';
  if (!d.approved) {
    return result(0, [{ ok: false, text: 'This seller has not completed our verification' }]);
  }
  const reasons: Reason[] = [
    { ok: d.checkIdentity, text: d.checkIdentity ? 'Identity confirmed by our team' : 'Identity not yet confirmed' },
    { ok: d.checkRera, text: d.checkRera ? proof : noProof },
    { ok: d.checkPhone, text: d.checkPhone ? 'We have spoken to them on their phone number' : 'Phone number not yet confirmed by a call' },
    { ok: d.checkAddress, text: d.checkAddress ? 'Address confirmed' : 'Address not yet confirmed' },
  ];
  if (!d.checkIdentity) return result(0, reasons);

  // How they have behaved here, once there is enough to judge by.
  const followUp = d.oldLeads >= 3 ? d.oldLeadsFollowedUp / d.oldLeads : null;
  const rejected = d.listings >= 4 ? d.listingsRejected / d.listings : null;
  if (followUp != null) reasons.push({ ok: followUp >= 0.6, text: `Follows up ${Math.round(followUp * 100)}% of buyer enquiries` });
  if (rejected != null && rejected >= 0.25) reasons.push({ ok: false, text: 'Several of their listings were turned down by our team' });
  if (d.complaints > 0) reasons.push({ ok: false, text: d.complaints === 1 ? 'A buyer complaint was upheld' : `${d.complaints} buyer complaints were upheld` });

  let level: Level = 1;
  if (d.checkRera && d.checkPhone) level = 2;
  if (level === 2 && d.checkAddress) level = 3;
  // Poor behaviour takes the top level away; an upheld complaint holds a dealer at the basic level until staff clear it.
  if (level === 3 && ((followUp != null && followUp < 0.6) || (rejected != null && rejected >= 0.25))) level = 2;
  if (d.complaints > 0) level = Math.min(level, 1) as Level;
  return result(level, reasons);
}

export interface PropertyFacts {
  /** The seller's confidence when they have their own account; null when our team or a builder's stock added the home. */
  seller: Confidence | null;
  staffVerified: boolean;
  photos: number;
  underConstruction: boolean;
  /** RERA number on record for the project. Every project under construction must have one by law. */
  reraOnRecord: boolean;
  pricePerSqft: number;
  /** The locality's average asking rate, and how many homes it is drawn from. */
  areaRate: number | null;
  areaHomes: number;
}

/** A price this far under the area average is a common mark of a fake listing, so it lowers confidence instead of raising appeal. */
export const TOO_CHEAP = 0.35;

export function propertyConfidence(p: PropertyFacts): Confidence {
  const reasons: Reason[] = [];
  let level: Level;

  if (p.seller) {
    level = p.seller.level;
    reasons.push({ ok: p.seller.level >= 2, text: p.seller.level >= 2 ? `Sold by a verified seller (${p.seller.label.toLowerCase()})` : p.seller.level === 1 ? 'Seller has passed only our basic checks' : 'Seller has not completed our verification' });
  } else {
    level = 1;
    reasons.push({ ok: true, text: 'Listed through our team, not by an outside seller' });
  }

  reasons.push({ ok: p.staffVerified, text: p.staffVerified ? 'Our team has checked this home’s papers or visited it' : 'Our team has not yet checked this home’s papers or visited it' });
  if (p.staffVerified) level = Math.max(level, 2) as Level;
  // The top level needs both: a seller we trust and this particular home checked.
  if (level === 3 && !p.staffVerified) level = 2;
  if (p.staffVerified && (!p.seller || p.seller.level >= 2)) level = 3;

  reasons.push({ ok: p.photos > 0, text: p.photos > 0 ? `${p.photos} ${p.photos === 1 ? 'photo' : 'photos'} of the home` : 'No photos yet' });
  if (p.photos === 0) level = Math.min(level, 2) as Level;

  if (p.underConstruction) {
    reasons.push({ ok: p.reraOnRecord, text: p.reraOnRecord ? 'RERA number on record for the project' : 'Under construction, but no RERA number on record' });
    if (!p.reraOnRecord) level = Math.min(level, 1) as Level;
  }

  if (p.areaRate && p.areaHomes >= 5 && p.pricePerSqft < p.areaRate * (1 - TOO_CHEAP)) {
    const under = Math.round((1 - p.pricePerSqft / p.areaRate) * 100);
    reasons.push({ ok: false, text: `Priced ${under}% below the area average. Ask why, and pay nothing before you have seen the home and its papers.` });
    if (!p.staffVerified) level = Math.min(level, 1) as Level;
  }
  return result(level, reasons);
}
