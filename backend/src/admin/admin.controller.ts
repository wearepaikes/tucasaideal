import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { AnyFilesInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthGateway } from '../auth/auth.gateway';
import { AdminService } from './admin.service';
import { BusinessProfileDto, CreateGoogleReviewDto, CreateProjectDto, CreateWorkDto, HouseCountProfileDto, ToggleActiveDto, UpdateLeadStatusDto, UpdateProjectDto, UpdateWorkDto } from './admin.dto';
import { R2StorageService, type UploadedImage } from './r2-storage.service';
import { GooglePlacesReviewsService } from '../reviews/google-places-reviews.service';

type AdminRequest = Request & { user: { id: number; role: 'ADMIN' | 'DIRECTOR' } };

@UseGuards(AuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly gateway: AuthGateway, private readonly storage: R2StorageService, private readonly placesReviews: GooglePlacesReviewsService) {}

  private splitFiles(files: UploadedImage[]) { return { images: files.filter((file) => file.fieldname === 'images'), panoramas: files.filter((file) => file.fieldname === 'panoramas') }; }

  @Get('dashboard') dashboard(@Query('from') from?: string, @Query('to') to?: string) { return this.admin.dashboard(from, to); }
  @Get('leads') leads(@Query('q') query?: string, @Query('status') status?: string, @Query('model') model?: string) { return this.admin.leads(query, status, model); }
  @Patch('leads/:id/status') updateLeadStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeadStatusDto) { return this.admin.updateLeadStatus(id, dto.status); }
  @Get('business-profile') businessProfile() { return this.admin.businessProfile(); }
  @Patch('business-profile') async updateBusinessProfile(@Body() dto: BusinessProfileDto) { const profile = await this.admin.updateBusinessProfile(dto); this.gateway.notifyBusinessProfile(profile); return profile; }
  @Patch('house-count-profile') async updateHouseCountProfile(@Body() dto: HouseCountProfileDto) { const profile = await this.admin.updateHouseCountProfile(dto); this.gateway.notifyBusinessProfile(profile); return profile; }
  @Get('reviews') googleReviews() { return this.admin.googleReviews(); }
  @Post('reviews/sync') syncGoogleReviews() { return this.placesReviews.sync(true); }
  @Post('reviews') async createGoogleReview(@Body() dto: CreateGoogleReviewDto) { const review = await this.admin.createGoogleReview(dto); this.gateway.notifyReviewsChanged({ action: 'created', reviewId: review.id }); return review; }
  @Patch('reviews/:id/replace-from-google') async replaceGoogleReview(@Param('id', ParseIntPipe) id: number) { const review = await this.placesReviews.replaceWithFreshReview(id); this.gateway.notifyReviewsChanged({ action: 'replacement', reviewId: review.id }); return review; }
  @Patch('reviews/:id/active') async toggleGoogleReview(@Param('id', ParseIntPipe) id: number, @Body() dto: ToggleActiveDto) { const review = await this.admin.toggleGoogleReview(id, dto.active); this.gateway.notifyReviewsChanged({ action: 'visibility', reviewId: id }); return review; }
  @Delete('reviews/:id') async deleteGoogleReview(@Param('id', ParseIntPipe) id: number) { await this.admin.deleteGoogleReview(id); this.gateway.notifyReviewsChanged({ action: 'deleted', reviewId: id }); return { deleted: true }; }
  @Get('users') users() { return this.admin.users(); }
  @Patch('users/:id/active') async toggleUser(@Param('id', ParseIntPipe) id: number, @Body() dto: ToggleActiveDto, @Req() request: AdminRequest) { const result = await this.admin.toggleUser(id, dto.active, request.user.id); if (result.active) this.gateway.notifyApproved(result.id); return result; }
  @Get('projects') projects() { return this.admin.projects(); }
  private existingPhotos(value?: string) { try { const parsed = JSON.parse(value || '[]'); if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) throw new Error(); return parsed as string[]; } catch { throw new BadRequestException('La lista de imágenes existentes no es válida.'); } }
  private withSelectedCover(existing: string[], uploaded: string[], selection?: string) {
    const photos = [...existing, ...uploaded];
    if (!selection) return photos;
    const newMatch = /^new:(\d+)$/.exec(selection);
    const cover = newMatch ? uploaded[Number(newMatch[1])] : existing.includes(selection) ? selection : undefined;
    if (!cover || !photos.includes(cover)) throw new BadRequestException('Seleccioná una portada válida.');
    return [cover, ...photos.filter((photo) => photo !== cover)];
  }
  @Post('projects') @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/) ? null : new BadRequestException('Solo se permiten imágenes JPG, PNG, WebP o AVIF.'), Boolean(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/))) }))
  async createProject(@Body() dto: CreateProjectDto, @UploadedFiles() files: UploadedImage[] = []) {
    if (!files.length) throw new BadRequestException('Subí al menos una imagen.');
    const photos = await this.storage.uploadProjectImages(files);
    try {
      const project = await this.admin.createProject(dto, this.withSelectedCover([], photos, dto.coverSelection));
      this.gateway.notifyProjectsChanged({ action: 'created', projectId: project.id });
      return project;
    }
    catch (error) { await this.storage.deleteProjectImages(photos).catch(() => undefined); throw error; }
  }
  @Patch('projects/:id') @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/) ? null : new BadRequestException('Solo se permiten imágenes JPG, PNG, WebP o AVIF.'), Boolean(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/))) }))
  async updateProject(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto, @UploadedFiles() files: UploadedImage[] = []) {
    const current = await this.admin.projects().then((items) => items.find((item) => item.id === id));
    if (!current) throw new BadRequestException('El proyecto no existe.');
    const oldPhotos = current.photos as string[];
    const existing = this.existingPhotos(dto.existingPhotos);
    if (new Set(existing).size !== existing.length || existing.some((photo) => !oldPhotos.includes(photo))) throw new BadRequestException('La lista de imágenes existentes no es válida.');
    if (existing.length + files.length > 10) throw new BadRequestException('Cada proyecto puede tener como máximo 10 imágenes.');
    if (!existing.length && !files.length) throw new BadRequestException('El proyecto debe conservar al menos una imagen.');
    const uploaded = await this.storage.uploadProjectImages(files);
    let photos: string[];
    try { photos = this.withSelectedCover(existing, uploaded, dto.coverSelection); }
    catch (error) { await this.storage.deleteProjectImages(uploaded).catch(() => undefined); throw error; }
    let updated;
    try { updated = await this.admin.updateProject(id, dto, photos); }
    catch (error) { await this.storage.deleteProjectImages(uploaded).catch(() => undefined); throw error; }
    this.gateway.notifyProjectsChanged({ action: 'updated', projectId: id });
    await this.storage.deleteProjectImages(oldPhotos.filter((photo) => !existing.includes(photo)));
    return updated;
  }
  @Delete('projects/:id') async deleteProject(@Param('id', ParseIntPipe) id: number) { const project = await this.admin.deleteProject(id); this.gateway.notifyProjectsChanged({ action: 'deleted', projectId: id }); await Promise.all([this.storage.deleteProjectImages(project.photos as string[]), this.storage.deleteProjectPanoramas(Array.isArray(project.panoramas) ? project.panoramas as string[] : [])]); return { deleted: true }; }
  @Patch('projects/:id/active') async toggleProject(@Param('id', ParseIntPipe) id: number, @Body() dto: ToggleActiveDto) { const project = await this.admin.toggleProject(id, dto.active); this.gateway.notifyProjectsChanged({ action: 'visibility', projectId: id }); return project; }
  @Patch('projects/:id/panoramas') @UseInterceptors(AnyFilesInterceptor({ limits: { files: 8, fileSize: 30 * 1024 * 1024 } }))
  async updateProjectPanoramas(@Param('id', ParseIntPipe) id: number, @Body('existingPanoramas') value?: string, @UploadedFiles() files: UploadedImage[] = []) {
    const current = await this.admin.projects().then((items) => items.find((item) => item.id === id));
    if (!current) throw new BadRequestException('El proyecto no existe.');
    const old = Array.isArray(current.panoramas) ? current.panoramas as string[] : [];
    const existing = this.existingPhotos(value);
    if (existing.some((url) => !old.includes(url)) || existing.length + files.length > 8) throw new BadRequestException('La selección de panoramas no es válida.');
    const uploaded = await this.storage.uploadProjectPanoramas(files);
    const project = await this.admin.replaceProjectPanoramas(id, [...existing, ...uploaded]).catch(async (error) => { await this.storage.deleteProjectPanoramas(uploaded); throw error; });
    await this.storage.deleteProjectPanoramas(old.filter((url) => !existing.includes(url)));
    this.gateway.notifyProjectsChanged({ action: 'updated', projectId: id });
    return project;
  }
  @Get('works') works() { return this.admin.works(); }
  @Post('works') @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/) ? null : new BadRequestException('Solo se permiten imÃ¡genes JPG, PNG, WebP o AVIF.'), Boolean(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/))) }))
  async createWork(@Body() dto: CreateWorkDto, @UploadedFiles() files: UploadedImage[] = []) {
    if (!files.length) throw new BadRequestException('SubÃ­ al menos una imagen.');
    const uploaded = await this.storage.uploadHouseImages(files);
    try {
      const work = await this.admin.createWork(dto, this.withSelectedCover([], uploaded, dto.coverSelection));
      this.gateway.notifyWorksChanged({ action: 'created', workId: work.id });
      this.gateway.notifyBusinessProfile(await this.admin.businessProfile());
      return work;
    } catch (error) { await this.storage.deleteHouseImages(uploaded).catch(() => undefined); throw error; }
  }
  @Patch('works/:id') @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/) ? null : new BadRequestException('Solo se permiten imÃ¡genes JPG, PNG, WebP o AVIF.'), Boolean(file.mimetype.match(/^image\/(jpeg|png|webp|avif)$/))) }))
  async updateWork(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkDto, @UploadedFiles() files: UploadedImage[] = []) {
    const current = await this.admin.works().then((items) => items.find((item) => item.id === id));
    if (!current) throw new BadRequestException('La casa no existe.');
    const oldPhotos = Array.isArray(current.photos) ? current.photos as string[] : [current.photo];
    const existing = this.existingPhotos(dto.existingPhotos);
    if (new Set(existing).size !== existing.length || existing.some((photo) => !oldPhotos.includes(photo))) throw new BadRequestException('La lista de imÃ¡genes existentes no es vÃ¡lida.');
    if (existing.length + files.length > 10) throw new BadRequestException('Cada casa puede tener como mÃ¡ximo 10 imÃ¡genes.');
    if (!existing.length && !files.length) throw new BadRequestException('La casa debe conservar al menos una imagen.');
    const uploaded = await this.storage.uploadHouseImages(files);
    let photos: string[];
    try { photos = this.withSelectedCover(existing, uploaded, dto.coverSelection); }
    catch (error) { await this.storage.deleteHouseImages(uploaded).catch(() => undefined); throw error; }
    let updated;
    try { updated = await this.admin.updateWork(id, dto, photos); }
    catch (error) { await this.storage.deleteHouseImages(uploaded).catch(() => undefined); throw error; }
    this.gateway.notifyWorksChanged({ action: 'updated', workId: id });
    await this.storage.deleteHouseImages(oldPhotos.filter((photo) => !existing.includes(photo)));
    return updated;
  }
  @Delete('works/:id') async deleteWork(@Param('id', ParseIntPipe) id: number) {
    const work = await this.admin.deleteWork(id);
    const photos = Array.isArray(work.photos) ? work.photos as string[] : [work.photo];
    this.gateway.notifyWorksChanged({ action: 'deleted', workId: id });
    this.gateway.notifyBusinessProfile(await this.admin.businessProfile());
    await this.storage.deleteHouseImages(photos);
    await this.storage.deleteHousePanoramas(Array.isArray(work.panoramas) ? work.panoramas as string[] : []);
    return { deleted: true };
  }
  @Patch('works/:id/active') async toggleWork(@Param('id', ParseIntPipe) id: number, @Body() dto: ToggleActiveDto) { const work = await this.admin.toggleWork(id, dto.active); this.gateway.notifyWorksChanged({ action: 'visibility', workId: id }); this.gateway.notifyBusinessProfile(await this.admin.businessProfile()); return work; }
  @Patch('works/:id/panoramas') @UseInterceptors(AnyFilesInterceptor({ limits: { files: 8, fileSize: 30 * 1024 * 1024 } }))
  async updateWorkPanoramas(@Param('id', ParseIntPipe) id: number, @Body('existingPanoramas') value?: string, @UploadedFiles() files: UploadedImage[] = []) {
    const current = await this.admin.works().then((items) => items.find((item) => item.id === id));
    if (!current) throw new BadRequestException('La casa no existe.');
    const old = Array.isArray(current.panoramas) ? current.panoramas as string[] : [];
    const existing = this.existingPhotos(value);
    if (existing.some((url) => !old.includes(url)) || existing.length + files.length > 8) throw new BadRequestException('La selección de panoramas no es válida.');
    const uploaded = await this.storage.uploadHousePanoramas(files);
    const work = await this.admin.replaceWorkPanoramas(id, [...existing, ...uploaded]).catch(async (error) => { await this.storage.deleteHousePanoramas(uploaded); throw error; });
    await this.storage.deleteHousePanoramas(old.filter((url) => !existing.includes(url)));
    this.gateway.notifyWorksChanged({ action: 'updated', workId: id });
    return work;
  }
}
