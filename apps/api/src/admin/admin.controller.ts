import { Body, Controller, Delete, Get, Header, HttpCode, HttpException, Ip, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Limiter } from '../ask/ask.service';
import { AdminService } from './admin.service';
import { AdminGuard, CurrentUser, Roles, SessionUser } from './auth';
import { IMPORT_SAMPLE } from './csv';
import { MAX_PHOTOS_PER_LISTING, MAX_PHOTO_BYTES } from './photos';

type Json = Record<string, unknown>;
type Upload = { buffer: Buffer; size: number };

/**
 * Three roles. ADMIN: everything. EDITOR: all content and approvals, not users. AGENT: only their own listings.
 * Routes without @Roles are open to any signed-in user and narrow what an agent can reach inside the service.
 */
@Controller('admin')
export class AdminController {
  // A handful of attempts per minute per address makes password guessing and mass sign-ups impractical.
  private attempts = new Limiter(5, 100_000);
  private signups = new Limiter(3, 2_000);
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email?: unknown; password?: unknown }, @Ip() ip: string) {
    if (!this.attempts.allow(ip)) throw new HttpException('Too many sign-in attempts. Wait a minute and try again.', 429);
    return this.admin.login(body?.email, body?.password);
  }

  @Post('register')
  register(@Body() body: Json, @Ip() ip: string) {
    if (!this.signups.allow(ip)) throw new HttpException('Too many sign-ups from this address. Try again later.', 429);
    return this.admin.register(body);
  }

  @UseGuards(AdminGuard) @Get('me') me(@CurrentUser() u: SessionUser) { return this.admin.me(u); }
  @UseGuards(AdminGuard) @Post('me/password') @HttpCode(200) changePassword(@CurrentUser() u: SessionUser, @Body() b: Json) { return this.admin.changePassword(u, b); }
  @UseGuards(AdminGuard) @Get('overview') overview(@CurrentUser() u: SessionUser) { return this.admin.overview(u); }
  @UseGuards(AdminGuard) @Get('options') options() { return this.admin.options(); }

  // Listings: any signed-in user, limited to their own for agents.
  @UseGuards(AdminGuard) @Get('properties') properties(@CurrentUser() u: SessionUser, @Query() q: { q?: string; state?: string; page?: string }) { return this.admin.properties(u, q); }
  @UseGuards(AdminGuard) @Get('properties/:id') property(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.property(u, id); }
  @UseGuards(AdminGuard) @Post('properties') createProperty(@CurrentUser() u: SessionUser, @Body() b: Json) { return this.admin.createProperty(u, b); }
  @UseGuards(AdminGuard) @Patch('properties/:id') updateProperty(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.admin.updateProperty(u, id, b); }
  @UseGuards(AdminGuard) @Delete('properties/:id') deleteProperty(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.deleteProperty(u, id); }

  @UseGuards(AdminGuard) @Post('properties/:id/photos')
  @UseInterceptors(FilesInterceptor('photos', MAX_PHOTOS_PER_LISTING, { limits: { fileSize: MAX_PHOTO_BYTES } }))
  addPhotos(@CurrentUser() u: SessionUser, @Param('id') id: string, @UploadedFiles() files: Upload[]) { return this.admin.addPhotos(u, id, files); }
  @UseGuards(AdminGuard) @Delete('photos/:id') deletePhoto(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.deletePhoto(u, id); }

  // Staff only from here.
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('properties/:id/review') @HttpCode(200) review(@Param('id') id: string, @Body() b: Json) { return this.admin.review(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('import/properties') @HttpCode(200) importProperties(@CurrentUser() u: SessionUser, @Body() b: { csv?: unknown }) { return this.admin.importProperties(u, b?.csv); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('import/sample.csv') @Header('content-type', 'text/csv; charset=utf-8') sample() { return IMPORT_SAMPLE; }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('questions') questions(@Query() q: { only?: string; page?: string }) { return this.admin.questions(q); }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('projects') projects() { return this.admin.projects(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('projects/:id') project(@Param('id') id: string) { return this.admin.project(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('projects') createProject(@Body() b: Json) { return this.admin.createProject(b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Patch('projects/:id') updateProject(@Param('id') id: string, @Body() b: Json) { return this.admin.updateProject(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Delete('projects/:id') deleteProject(@Param('id') id: string) { return this.admin.deleteProject(id); }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('localities') localities() { return this.admin.localities(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('localities/:id') locality(@Param('id') id: string) { return this.admin.locality(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('localities') createLocality(@Body() b: Json) { return this.admin.createLocality(b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Patch('localities/:id') updateLocality(@Param('id') id: string, @Body() b: Json) { return this.admin.updateLocality(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Delete('localities/:id') deleteLocality(@Param('id') id: string) { return this.admin.deleteLocality(id); }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('cities') cities() { return this.admin.cities(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('cities/:id') city(@Param('id') id: string) { return this.admin.city(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('cities') createCity(@Body() b: Json) { return this.admin.createCity(b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Patch('cities/:id') updateCity(@Param('id') id: string, @Body() b: Json) { return this.admin.updateCity(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Delete('cities/:id') deleteCity(@Param('id') id: string) { return this.admin.deleteCity(id); }

  // Users: admins only.
  @UseGuards(AdminGuard) @Roles('ADMIN') @Get('users') users() { return this.admin.users(); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Get('users/:id') user(@Param('id') id: string) { return this.admin.user(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Post('users') createUser(@Body() b: Json) { return this.admin.createUser(b); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Patch('users/:id') updateUser(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.admin.updateUser(u, id, b); }
}
