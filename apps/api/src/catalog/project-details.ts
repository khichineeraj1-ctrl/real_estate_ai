import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Input } from '../admin/input';
import { PrismaService } from '../prisma/prisma.service';
import { amenityOptions } from './amenities';
import { LANDMARK_KINDS, LANDMARK_LABEL, readLandmarks } from './nearby';

type Body = Record<string, unknown>;
const n = (v: bigint | null) => (v == null ? null : Number(v));
export const unitOut = (u: { id: string; label: string; bhk: number | null; carpetMinSqft: number; carpetMaxSqft: number | null; priceMinInr: bigint | null; priceMaxInr: bigint | null; planFile: string | null }) => ({
  id: u.id, label: u.label, bhk: u.bhk, carpetMinSqft: u.carpetMinSqft, carpetMaxSqft: u.carpetMaxSqft, priceMinInr: n(u.priceMinInr), priceMaxInr: n(u.priceMaxInr), planFile: u.planFile,
  // The honest comparison: what a square foot you can actually use costs, when both figures are given.
  ratePerCarpetSqft: u.priceMinInr ? Math.round(Number(u.priceMinInr) / u.carpetMinSqft) : null,
});

/** What our team adds to a project beyond the register: the homes it offers, and the places distances are measured to. */
@Injectable()
export class ProjectDetailsService {
  constructor(private readonly db: PrismaService) {}

  /** Everything the project's edit screen needs for these sections. */
  async forEdit(projectId: string) {
    const p = await this.db.project.findUnique({ where: { id: projectId }, select: { amenities: true, lat: true, lng: true, units: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }, photos: { where: { category: 'PLAN' }, orderBy: { position: 'asc' }, select: { file: true } }, locality: { select: { lat: true, lng: true, name: true } } } });
    if (!p) throw new NotFoundException('Project not found');
    return { amenities: p.amenities, amenityOptions: amenityOptions(), pin: p.lat != null && p.lng != null ? `${p.lat}, ${p.lng}` : '', locality: p.locality, units: p.units.map(unitOut), plans: p.photos.map((x) => x.file) };
  }
  async addUnit(projectId: string, body: Body) {
    const p = await this.db.project.findUnique({ where: { id: projectId }, select: { id: true, _count: { select: { units: true } } } });
    if (!p) throw new NotFoundException('Project not found');
    if (p._count.units >= 20) throw new BadRequestException('A project can list at most 20 kinds of home');
    const i = new Input(body);
    const label = i.text('label', 'Name', 60);
    const carpetMinSqft = i.number('carpetMinSqft', 'Carpet area', 100, 50_000);
    const carpetMaxSqft = i.optionalNumber('carpetMaxSqft', 'Largest carpet area', 100, 50_000);
    if (carpetMaxSqft != null && carpetMaxSqft < carpetMinSqft) throw new BadRequestException('The largest carpet area must not be below the smallest');
    const priceMin = i.optionalNumber('priceMinInr', 'Price from', 100_000, 5_000_000_000);
    const priceMax = i.optionalNumber('priceMaxInr', 'Price to', 100_000, 5_000_000_000);
    if (priceMax != null && priceMin == null) throw new BadRequestException('Give the starting price as well as the top price');
    if (priceMax != null && priceMin != null && priceMax < priceMin) throw new BadRequestException('The top price must not be below the starting price');
    const planFile = i.optionalText('planFile', 'Floor plan', 80);
    if (planFile && !(await this.db.photo.findFirst({ where: { projectId, file: planFile }, select: { id: true } }))) throw new BadRequestException('Choose a floor plan from this project’s photos');
    // The bedroom count is read from the name when it is not given: "3 BHK + Study" is a 3.
    const bhk = i.optionalNumber('bhk', 'Bedrooms', 0, 9) ?? (/(\d)(?:\.5)?\s*bhk/i.exec(label) ? Number(/(\d)(?:\.5)?\s*bhk/i.exec(label)![1]) : null);
    await this.db.projectUnit.create({ data: { projectId, label, bhk, carpetMinSqft, carpetMaxSqft, priceMinInr: priceMin == null ? null : BigInt(priceMin), priceMaxInr: priceMax == null ? null : BigInt(priceMax), planFile, position: p._count.units } });
    return { ok: true as const };
  }
  async removeUnit(projectId: string, unitId: string) { await this.db.projectUnit.deleteMany({ where: { id: unitId, projectId } }); return { ok: true as const }; }

  // ---- Places distances are measured to, one list per city

  async landmarks(citySlug?: string) {
    const cities = await this.db.city.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true, _count: { select: { landmarks: true } } } });
    const city = cities.find((c) => c.slug === citySlug) ?? cities[0] ?? null;
    const rows = city ? await this.db.landmark.findMany({ where: { city: { slug: city.slug } }, orderBy: [{ kind: 'asc' }, { name: 'asc' }] }) : [];
    return { cities: cities.map((c) => ({ slug: c.slug, name: c.name, count: c._count.landmarks })), city: city?.slug ?? null, kinds: LANDMARK_KINDS.map((k) => ({ code: k, label: LANDMARK_LABEL[k] })), rows };
  }
  async addLandmarks(citySlug: string, body: Body) {
    const city = await this.db.city.findUnique({ where: { slug: citySlug }, select: { id: true, lat: true, lng: true, name: true } });
    if (!city) throw new NotFoundException('City not found');
    const { rows, error } = readLandmarks(String(body.lines ?? ''));
    if (error) throw new BadRequestException(error);
    if (!rows.length) throw new BadRequestException('Add at least one line');
    // A pin far from the city is almost always a typing slip or a place meant for another city.
    const far = rows.find((r) => Math.abs(r.lat - city.lat) > 1.5 || Math.abs(r.lng - city.lng) > 1.5);
    if (far) throw new BadRequestException(`“${far.name}” is far from ${city.name}. Check its pin, or add it under the right city.`);
    let added = 0;
    for (const r of rows) {
      const made = await this.db.landmark.upsert({ where: { cityId_kind_name: { cityId: city.id, kind: r.kind, name: r.name } }, update: { lat: r.lat, lng: r.lng }, create: { cityId: city.id, ...r } });
      if (made) added++;
    }
    return { ok: true as const, added };
  }
  async removeLandmark(id: string) { await this.db.landmark.deleteMany({ where: { id } }); return { ok: true as const }; }
}
