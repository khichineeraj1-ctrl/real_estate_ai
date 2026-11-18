/** The stages of following up a lead, shared by the server-rendered list and the in-place editor. */
export const LEAD_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'VISIT_PLANNED', label: 'Site visit planned' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
] as const;
