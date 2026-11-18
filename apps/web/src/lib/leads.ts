/** The stages of following up a lead, shared by the server-rendered list and the in-place editor. */
export const LEAD_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'VISIT_PLANNED', label: 'Site visit planned' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
] as const;

/** The answers a buyer can give about their plans on an enquiry form. The codes match apps/api/src/leads/score.ts. */
export const TIMELINES = { NOW: 'Within a month', SOON: 'In 1 to 3 months', LATER: 'In 3 to 6 months', EXPLORING: 'Just exploring' };
export const BUDGETS = { U50L: 'Under ₹50 lakh', '50L_1CR': '₹50 lakh to ₹1 crore', '1_2CR': '₹1 to 2 crore', '2_5CR': '₹2 to 5 crore', '5CR_PLUS': 'Above ₹5 crore' };
export const LOANS = { APPROVED: 'Loan already approved', NEEDED: 'Will need a home loan', NONE: 'Without a loan' };
export const PURPOSES = { SELF: 'To live in', INVEST: 'An investment' };
/** How strong a lead looks. Hot: call today. Warm: worth a call this week. Cold: little sign of intent yet. */
export const BANDS = [{ value: 'HOT', label: 'Hot' }, { value: 'WARM', label: 'Warm' }, { value: 'COLD', label: 'Cold' }] as const;
