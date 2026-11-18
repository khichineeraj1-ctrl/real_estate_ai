const trim = (x: number) => String(Number(x.toFixed(2)));

/** Short price for cards and titles: ₹85 L, ₹1.25 Cr. */
export function price(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
export const num = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-IN'));
export const rate = (n: number | null | undefined) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}/sq ft`);
export const statusLabel = (s: string) => (s === 'READY_TO_MOVE' ? 'Ready to move' : 'Under construction');
export const typeLabel = (t: string) => ({ APARTMENT: 'Flat', VILLA: 'Villa', BUILDER_FLOOR: 'Builder floor', PLOT: 'Plot' })[t] ?? t;
export const monthYear = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : null);
export const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
