import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessProfileDto, CreateGoogleReviewDto, CreateProjectDto, CreateWorkDto, HouseCountProfileDto, UpdateWorkDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private youtubeId(value?: string) {
    const input = value?.trim();
    if (!input) return null;
    if (/^[\w-]{11}$/.test(input)) return input;
    try {
      const url = new URL(input);
      const host = url.hostname.replace(/^www\./, '');
      const id = host === 'youtu.be' ? url.pathname.split('/').filter(Boolean)[0] : host.endsWith('youtube.com') ? (url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/)?.[1]) : null;
      if (id && /^[\w-]{11}$/.test(id)) return id;
    } catch { /* Se valida abajo con un mensaje claro. */ }
    throw new BadRequestException('Pegá un enlace válido de YouTube.');
  }

  private range(from?: string, to?: string) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (from) { const date = new Date(`${from}T00:00:00`); if (!Number.isNaN(date.valueOf())) createdAt.gte = date; }
    if (to) { const date = new Date(`${to}T23:59:59.999`); if (!Number.isNaN(date.valueOf())) createdAt.lte = date; }
    return Object.keys(createdAt).length ? { createdAt } : {};
  }

  async dashboard(from?: string, to?: string) {
    const where = this.range(from, to);
    const [houses, projects, users, leads, workDates, projectDates] = await Promise.all([
      this.prisma.work.count({ where }), this.prisma.project.count({ where }), this.prisma.user.count({ where }), this.prisma.lead.count({ where }),
      this.prisma.work.findMany({ where, select: { createdAt: true } }), this.prisma.project.findMany({ where, select: { createdAt: true } }),
    ]);
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + offset, 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: new Intl.DateTimeFormat('es', { month: 'short' }).format(date), houses: 0, projects: 0 };
    });
    const byKey = new Map(months.map((month) => [month.key, month]));
    workDates.forEach(({ createdAt }) => { const item = byKey.get(`${createdAt.getFullYear()}-${createdAt.getMonth()}`); if (item) item.houses += 1; });
    projectDates.forEach(({ createdAt }) => { const item = byKey.get(`${createdAt.getFullYear()}-${createdAt.getMonth()}`); if (item) item.projects += 1; });
    return { totals: { houses, projects, users, leads }, months };
  }

  async leads(query?: string, status?: string, model?: string) {
    const search = query?.trim();
    const validStatus = status === 'NEW' || status === 'CONTACTED' ? status : undefined;
    const selectedModel = model?.trim();
    return this.prisma.lead.findMany({
      where: {
        ...(validStatus ? { status: validStatus } : {}),
        ...(selectedModel ? { model: selectedModel } : {}),
        ...(search ? { OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { model: { contains: search } },
          { location: { contains: search } },
        ] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateLeadStatus(id: number, status: 'NEW' | 'CONTACTED') {
    return this.prisma.lead.update({ where: { id }, data: { status } });
  }

  private serviceYears(profile: { serviceYearsMode: string; serviceStartDate: Date | null; manualServiceYears: number | null }) {
    if (profile.serviceYearsMode === 'MANUAL') return profile.manualServiceYears ?? 0;
    if (!profile.serviceStartDate) return 0;
    const now = new Date();
    let years = now.getFullYear() - profile.serviceStartDate.getFullYear();
    const anniversary = new Date(now.getFullYear(), profile.serviceStartDate.getMonth(), profile.serviceStartDate.getDate());
    if (now < anniversary) years -= 1;
    return Math.max(0, years);
  }

  async businessProfile() {
    const profile = await this.prisma.businessProfile.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    const publishedHouses = await this.prisma.work.count({ where: { active: true } });
    return { mode: profile.serviceYearsMode, startDate: profile.serviceStartDate?.toISOString().slice(0, 10) || '', manualYears: profile.manualServiceYears ?? 0, years: this.serviceYears(profile), houseCountMode: profile.houseCountMode, manualHouseCount: profile.manualHouseCount ?? 0, publishedHouses, houseCount: profile.houseCountMode === 'MANUAL' ? profile.manualHouseCount ?? 0 : publishedHouses, updatedAt: profile.updatedAt };
  }

  async updateHouseCountProfile(dto: HouseCountProfileDto) {
    await this.prisma.businessProfile.upsert({
      where: { id: 1 },
      create: { id: 1, houseCountMode: dto.mode, manualHouseCount: dto.mode === 'MANUAL' ? dto.manualCount : null },
      update: { houseCountMode: dto.mode, manualHouseCount: dto.mode === 'MANUAL' ? dto.manualCount : null },
    });
    return this.businessProfile();
  }

  async updateBusinessProfile(dto: BusinessProfileDto) {
    await this.prisma.businessProfile.upsert({
      where: { id: 1 },
      create: { id: 1, serviceYearsMode: dto.mode, serviceStartDate: dto.mode === 'AUTOMATIC' && dto.startDate ? new Date(`${dto.startDate}T00:00:00`) : null, manualServiceYears: dto.mode === 'MANUAL' ? dto.manualYears : null },
      update: { serviceYearsMode: dto.mode, serviceStartDate: dto.mode === 'AUTOMATIC' && dto.startDate ? new Date(`${dto.startDate}T00:00:00`) : null, manualServiceYears: dto.mode === 'MANUAL' ? dto.manualYears : null },
    });
    return this.businessProfile();
  }

  users() {
    return this.prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }

  async toggleUser(id: number, active: boolean, currentUserId: number) {
    if (id === currentUserId && !active) throw new BadRequestException('No podés desactivar tu propia cuenta.');
    return this.prisma.user.update({ where: { id }, data: { active }, select: { id: true, active: true } });
  }

  projects() { return this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } }); }
  async createProject(dto: CreateProjectDto, photos: string[], panoramas: string[] = []) {
    const base = dto.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'proyecto';
    let slug = base;
    let suffix = 1;
    while (await this.prisma.project.findUnique({ where: { slug } })) slug = `${base}-${++suffix}`;
    return this.prisma.project.create({ data: { slug, name: dto.name, status: dto.status, cover: photos[0], photos, panoramas } });
  }
  async updateProject(id: number, dto: CreateProjectDto, photos: string[], panoramas: string[] = []) { return this.prisma.project.update({ where: { id }, data: { name: dto.name, status: dto.status, cover: photos[0], photos, panoramas } }); }
  async deleteProject(id: number) { const project = await this.prisma.project.delete({ where: { id } }); return project; }
  toggleProject(id: number, active: boolean) { return this.prisma.project.update({ where: { id }, data: { active } }); }
  replaceProjectPanoramas(id: number, panoramas: string[]) { return this.prisma.project.update({ where: { id }, data: { panoramas } }); }

  works() { return this.prisma.work.findMany({ orderBy: { createdAt: 'desc' } }); }
  createWork(dto: CreateWorkDto, photos: string[], panoramas: string[] = []) {
    const { coverSelection: _coverSelection, ...data } = dto;
    return this.prisma.work.create({ data: { ...data, youtubeId: this.youtubeId(dto.youtubeId), photo: photos[0], photos, panoramas, model: String(dto.area), deliveredAt: dto.status === 'ENTREGADA' ? new Date() : null } });
  }
  updateWork(id: number, dto: UpdateWorkDto, photos: string[], panoramas: string[] = []) {
    const { coverSelection: _coverSelection, existingPhotos: _existingPhotos, existingPanoramas: _existingPanoramas, ...data } = dto;
    return this.prisma.work.update({ where: { id }, data: { ...data, youtubeId: this.youtubeId(dto.youtubeId), photo: photos[0], photos, panoramas, model: String(dto.area), deliveredAt: dto.status === 'ENTREGADA' ? new Date() : null } });
  }
  deleteWork(id: number) { return this.prisma.work.delete({ where: { id } }); }
  toggleWork(id: number, active: boolean) { return this.prisma.work.update({ where: { id }, data: { active } }); }
  replaceWorkPanoramas(id: number, panoramas: string[]) { return this.prisma.work.update({ where: { id }, data: { panoramas } }); }

  googleReviews() { return (this.prisma as any).googleReview.findMany({ orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }] }); }
  createGoogleReview(dto: CreateGoogleReviewDto) {
    return (this.prisma as any).googleReview.create({ data: { author: dto.author.trim(), rating: dto.rating, text: dto.text.trim(), reviewDate: dto.reviewDate ? new Date(`${dto.reviewDate}T00:00:00`) : null, active: dto.active ?? true } });
  }
  toggleGoogleReview(id: number, active: boolean) { return (this.prisma as any).googleReview.update({ where: { id }, data: { active } }); }
  deleteGoogleReview(id: number) { return (this.prisma as any).googleReview.delete({ where: { id } }); }
}
