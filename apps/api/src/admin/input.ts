import { BadRequestException } from '@nestjs/common';

/** Reads and checks fields from a request body. Forms send everything as text, so numbers arrive as strings. */
export class Input {
  constructor(private readonly body: Record<string, unknown>) {
    if (!body || typeof body !== 'object') throw new BadRequestException('A JSON body is required');
  }
  private raw(key: string) { const v = this.body[key]; return v == null ? '' : String(v).trim(); }

  text(key: string, label: string, max = 200): string {
    const v = this.raw(key);
    if (!v) throw new BadRequestException(`${label} is required`);
    if (v.length > max) throw new BadRequestException(`${label} must be under ${max} characters`);
    return v;
  }
  optionalText(key: string, label: string, max = 200): string | null { return this.raw(key) ? this.text(key, label, max) : null; }

  number(key: string, label: string, min: number, max: number, whole = true): number {
    const v = this.raw(key);
    const n = Number(v);
    if (!v || !Number.isFinite(n) || (whole && !Number.isInteger(n))) throw new BadRequestException(`${label} must be a ${whole ? 'whole ' : ''}number`);
    if (n < min || n > max) throw new BadRequestException(`${label} must be between ${min.toLocaleString('en-IN')} and ${max.toLocaleString('en-IN')}`);
    return n;
  }
  optionalNumber(key: string, label: string, min: number, max: number): number | null { return this.raw(key) ? this.number(key, label, min, max) : null; }

  oneOf<T extends string>(key: string, label: string, allowed: readonly T[]): T {
    const v = this.raw(key);
    if (!allowed.includes(v as T)) throw new BadRequestException(`${label} must be one of: ${allowed.join(', ')}`);
    return v as T;
  }
  /** A month such as 2027-06, stored as the first day of that month. */
  optionalMonth(key: string, label: string): Date | null {
    const v = this.raw(key);
    if (!v) return null;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw new BadRequestException(`${label} must be a month like 2027-06`);
    return new Date(`${v}-01T00:00:00Z`);
  }
  /** One item per line or comma. */
  list(key: string, label: string, maxItems = 20): string[] {
    const items = this.raw(key).split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    if (items.length > maxItems) throw new BadRequestException(`${label} can have at most ${maxItems} items`);
    if (items.some((x) => x.length > 80)) throw new BadRequestException(`Each item in ${label} must be under 80 characters`);
    return items;
  }
}

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
