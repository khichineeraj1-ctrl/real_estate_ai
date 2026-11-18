import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConstructionStatus, ListedBy, Prisma, PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Input, slugify } from './input';

const PAGE = 25;
/** Questions the listings could not answer as asked: nothing found, or found only after widening the search. */
const NO_EXACT_MATCH: Prisma.QuestionWhereInput = { OR: [{ total: 0 }, { relaxed: { not: null } }] };
const page = (v: unknown) => Math.max(1, Number.parseInt(String(v ?? '1'), 10) || 1);

@Injectable()
export class AdminService {
  constructor(private readonly db: PrismaService) {}

  async overview() {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [cities, localities, projects, properties, questions, questionsWeek, emptyWeek] = await Promise.all([
      this.db.city.count(), this.db.locality.count(), this.db.project.count(), this.db.property.count(), this.db.question.count(),
      this.db.question.count({ where: { createdAt: { gte: weekAgo } } }), this.db.question.count({ where: { createdAt: { gte: weekAgo }, ...NO_EXACT_MATCH } }),
    ]);
    return { cities, localities, projects, properties, questions, questionsWeek, emptyWeek };
  }

  /** Everything the forms need for their dropdowns. */
  async options() {
    const cities = await this.db.city.findMany({
      orderBy: { name: 'asc' }, select: { id: true, name: true, localities: { orderBy: { name: 'asc' }, select: { id: true, name: true, projects: { orderBy: { name: 'asc' }, select: { id: true, name: true } } } } },
    });
    return { cities };
  }

  // ---- Properties

  async properties(q: { q?: string; city?: string; page?: string }) {
    const where: Prisma.PropertyWhereInput = {
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { slug: { contains: q.q, mode: 'insensitive' } }] } : {}),
      ...(q.city ? { locality: { cityId: q.city } } : {}),
    };
    const p = page(q.page);
    const [items, total] = await Promise.all([
      this.db.property.findMany({
        where, orderBy: [{ postedAt: 'desc' }, { slug: 'asc' }], skip: (p - 1) * PAGE, take: PAGE,
        select: { id: true, slug: true, title: true, priceInr: true, areaSqft: true, status: true, postedAt: true, locality: { select: { name: true, city: { select: { name: true } } } } },
      }),
      this.db.property.count({ where }),
    ]);
    return { items, total, page: p, pageSize: PAGE };
  }

  async property(id: string) {
    const p = await this.db.property.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  private async propertyData(body: Record<string, unknown>) {
    const i = new Input(body);
    const type = i.oneOf('type', 'Type', Object.values(PropertyType));
    const plot = type === 'PLOT';
    const localityId = i.text('localityId', 'Locality');
    const projectId = i.optionalText('projectId', 'Project');
    if (!(await this.db.locality.findUnique({ where: { id: localityId }, select: { id: true } }))) throw new BadRequestException('Choose a locality from the list');
    if (projectId) {
      const project = await this.db.project.findUnique({ where: { id: projectId }, select: { localityId: true } });
      if (!project || project.localityId !== localityId) throw new BadRequestException('That project is not in the chosen locality');
    }
    const floor = plot ? null : i.optionalNumber('floor', 'Floor', 0, 150);
    const totalFloors = plot ? null : i.optionalNumber('totalFloors', 'Total floors', 1, 150);
    if (floor != null && totalFloors != null && floor > totalFloors) throw new BadRequestException('Floor cannot be higher than total floors');
    const status = i.oneOf('status', 'Status', Object.values(ConstructionStatus));
    return {
      title: i.text('title', 'Title', 160), description: i.text('description', 'Description', 2000), type,
      bhk: plot ? 0 : i.number('bhk', 'Bedrooms (BHK)', 1, 10), bathrooms: plot ? 0 : i.number('bathrooms', 'Bathrooms', 1, 12),
      priceInr: i.number('priceInr', 'Price', 100_000, 2_000_000_000), areaSqft: i.number('areaSqft', 'Area', 100, 200_000),
      floor, totalFloors, facing: i.optionalText('facing', 'Facing', 30), furnishing: plot ? null : i.optionalText('furnishing', 'Furnishing', 30),
      status, possession: status === 'UNDER_CONSTRUCTION' ? i.optionalMonth('possession', 'Possession') : null,
      amenities: i.list('amenities', 'Amenities'), listedBy: i.oneOf('listedBy', 'Listed by', Object.values(ListedBy)), localityId, projectId,
    };
  }

  async createProperty(body: Record<string, unknown>) {
    const data = await this.propertyData(body);
    // The address of a listing never changes after this, so links and search results keep working when the title is edited.
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${slugify(data.title)}-${Math.floor(10_000 + Math.random() * 90_000)}`;
      if (!(await this.db.property.findUnique({ where: { slug }, select: { id: true } }))) return this.db.property.create({ data: { ...data, slug } });
    }
    throw new ConflictException('Could not create a unique address for this listing; try again');
  }
  async updateProperty(id: string, body: Record<string, unknown>) {
    await this.property(id);
    return this.db.property.update({ where: { id }, data: await this.propertyData(body) });
  }
  async deleteProperty(id: string) {
    await this.property(id);
    await this.db.property.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Projects

  projects() {
    return this.db.project.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, builder: true, status: true, locality: { select: { name: true, city: { select: { name: true } } } }, _count: { select: { properties: true } } },
    });
  }
  async project(id: string) {
    const p = await this.db.project.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }
  private async projectData(body: Record<string, unknown>) {
    const i = new Input(body);
    const localityId = i.text('localityId', 'Locality');
    const locality = await this.db.locality.findUnique({ where: { id: localityId }, select: { name: true, city: { select: { name: true } } } });
    if (!locality) throw new BadRequestException('Choose a locality from the list');
    const status = i.oneOf('status', 'Status', Object.values(ConstructionStatus));
    return {
      locality,
      data: {
        name: i.text('name', 'Name', 120), builder: i.text('builder', 'Builder', 120), description: i.text('description', 'Description', 2000), status,
        possession: status === 'UNDER_CONSTRUCTION' ? i.optionalMonth('possession', 'Possession') : null, reraId: i.optionalText('reraId', 'RERA number', 80),
        totalUnits: i.number('totalUnits', 'Total units', 1, 50_000), amenities: i.list('amenities', 'Amenities'), localityId,
      },
    };
  }
  async createProject(body: Record<string, unknown>) {
    const { data, locality } = await this.projectData(body);
    const slug = slugify(`${data.name} ${locality.name} ${locality.city.name}`);
    if (await this.db.project.findUnique({ where: { slug }, select: { id: true } })) throw new ConflictException('A project with this name already exists in that locality');
    return this.db.project.create({ data: { ...data, slug } });
  }
  async updateProject(id: string, body: Record<string, unknown>) {
    const current = await this.project(id);
    const { data } = await this.projectData(body);
    if (data.localityId !== current.localityId && (await this.db.property.count({ where: { projectId: id } }))) throw new ConflictException('This project has listings, so it cannot be moved to another locality');
    return this.db.project.update({ where: { id }, data });
  }
  /** Listings in the project are kept and simply stop being linked to it. */
  async deleteProject(id: string) {
    await this.project(id);
    await this.db.$transaction([this.db.property.updateMany({ where: { projectId: id }, data: { projectId: null } }), this.db.project.delete({ where: { id } })]);
    return { ok: true };
  }

  // ---- Localities

  localities() {
    return this.db.locality.findMany({
      orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, city: { select: { slug: true, name: true } }, _count: { select: { properties: true, projects: true } } },
    });
  }
  async locality(id: string) {
    const l = await this.db.locality.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Locality not found');
    return l;
  }
  private placeData(i: Input) {
    return { lat: i.number('lat', 'Latitude', -90, 90, false), lng: i.number('lng', 'Longitude', -180, 180, false) };
  }
  async createLocality(body: Record<string, unknown>) {
    const i = new Input(body);
    const cityId = i.text('cityId', 'City');
    if (!(await this.db.city.findUnique({ where: { id: cityId }, select: { id: true } }))) throw new BadRequestException('Choose a city from the list');
    const name = i.text('name', 'Name', 80);
    const slug = slugify(name);
    if (!slug) throw new BadRequestException('Name must contain letters or numbers');
    if (await this.db.locality.findFirst({ where: { cityId, slug }, select: { id: true } })) throw new ConflictException('This city already has a locality with that name');
    return this.db.locality.create({ data: { cityId, name, slug, intro: i.text('intro', 'Introduction', 1000), highlights: i.list('highlights', 'Highlights', 8), ...this.placeData(i) } });
  }
  /** The city and the page address stay fixed; name, text and location can change. */
  async updateLocality(id: string, body: Record<string, unknown>) {
    await this.locality(id);
    const i = new Input(body);
    return this.db.locality.update({ where: { id }, data: { name: i.text('name', 'Name', 80), intro: i.text('intro', 'Introduction', 1000), highlights: i.list('highlights', 'Highlights', 8), ...this.placeData(i) } });
  }
  async deleteLocality(id: string) {
    await this.locality(id);
    const [properties, projects] = await Promise.all([this.db.property.count({ where: { localityId: id } }), this.db.project.count({ where: { localityId: id } })]);
    if (properties || projects) throw new ConflictException(`This locality still has ${properties} listings and ${projects} projects. Remove or move them first.`);
    await this.db.locality.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Cities

  cities() {
    return this.db.city.findMany({ orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true, state: true, _count: { select: { localities: true } } } });
  }
  async city(id: string) {
    const c = await this.db.city.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('City not found');
    return c;
  }
  private cityData(i: Input) {
    return { name: i.text('name', 'Name', 80), state: i.text('state', 'State', 80), intro: i.text('intro', 'Introduction', 1000), ...this.placeData(i) };
  }
  async createCity(body: Record<string, unknown>) {
    const data = this.cityData(new Input(body));
    const slug = slugify(data.name);
    // City pages live at the top of the site (/pune), so a city cannot take the address of another section.
    if (!slug || ['ask', 'admin', 'api', 'projects', 'property', 'sitemap-xml', 'robots-txt'].includes(slug)) throw new BadRequestException('That name cannot be used for a city');
    if (await this.db.city.findUnique({ where: { slug }, select: { id: true } })) throw new ConflictException('A city with that name already exists');
    return this.db.city.create({ data: { ...data, slug } });
  }
  async updateCity(id: string, body: Record<string, unknown>) {
    await this.city(id);
    return this.db.city.update({ where: { id }, data: this.cityData(new Input(body)) });
  }
  async deleteCity(id: string) {
    await this.city(id);
    const localities = await this.db.locality.count({ where: { cityId: id } });
    if (localities) throw new ConflictException(`This city still has ${localities} localities. Remove them first.`);
    await this.db.city.delete({ where: { id } });
    return { ok: true };
  }

  // ---- Questions buyers asked

  async questions(q: { only?: string; page?: string }) {
    const where: Prisma.QuestionWhereInput = q.only === 'empty' ? NO_EXACT_MATCH : {};
    const p = page(q.page);
    const [items, total, all, empty] = await Promise.all([
      this.db.question.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * 50, take: 50 }),
      this.db.question.count({ where }), this.db.question.count(), this.db.question.count({ where: NO_EXACT_MATCH }),
    ]);
    return { items, total, page: p, pageSize: 50, all, empty };
  }
}
