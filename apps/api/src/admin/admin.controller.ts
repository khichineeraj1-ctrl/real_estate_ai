import { Body, Controller, Delete, Get, Header, HttpCode, HttpException, Ip, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Limiter } from '../ask/ask.service';
import { AdminService } from './admin.service';
import { AdminGuard, CurrentUser, Roles, SessionUser } from './auth';
import { IMPORT_SAMPLE } from './csv';
import { MAX_PHOTOS_PER_LISTING, MAX_PHOTO_BYTES } from './photos';
import { Reminders } from './reminders';

type Json = Record<string, unknown>;
type Upload = { buffer: Buffer; size: number };

/**
 * Four roles. ADMIN: everything. EDITOR: all content and approvals, not users. AGENT: only their own listings.
 * BUILDER: only the leads on projects assigned to them. Routes without @Roles are open to any signed-in user and
 * narrow what each role can reach inside the service.
 */
@Controller('admin')
export class AdminController {
  // Password guessing is limited per account (five tries a minute for one email), so it stays impractical however many
  // addresses are used. The site signs in on everyone's behalf from one address, so the per-address caps are only a
  // loose ceiling against floods and never lock ordinary users out.
  private attempts = new Limiter(5, 200_000);
  private perAddress = new Limiter(60, 200_000);
  private signups = new Limiter(20, 5_000);
  private emails = new Limiter(2, 10_000); // per account or email: emails cost money and can be used to pester someone
  private key = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase().slice(0, 160) : '');
  constructor(private readonly admin: AdminService, private readonly reminders: Reminders) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email?: unknown; password?: unknown }, @Ip() ip: string) {
    if (!this.perAddress.allow(ip) || !this.attempts.allow(`login:${this.key(body?.email)}`)) throw new HttpException('Too many sign-in attempts. Wait a minute and try again.', 429);
    return this.admin.login(body?.email, body?.password);
  }

  @Post('register')
  register(@Body() body: Json, @Ip() ip: string) {
    if (!this.signups.allow(ip)) throw new HttpException('Too many sign-ups from this address. Try again later.', 429);
    return this.admin.register(body);
  }

  @Post('verify-email') @HttpCode(200) verifyEmail(@Body() b: { token?: unknown }) { return this.admin.verifyEmail(b?.token); }
  @Post('forgot') @HttpCode(200)
  forgot(@Body() b: { email?: unknown }, @Ip() ip: string) {
    if (!this.perAddress.allow(ip) || !this.emails.allow(`forgot:${this.key(b?.email)}`)) throw new HttpException('Too many requests. Wait a minute and try again.', 429);
    return this.admin.forgotPassword(b?.email);
  }
  @Post('reset') @HttpCode(200)
  reset(@Body() b: Json, @Ip() ip: string) {
    if (!this.perAddress.allow(ip)) throw new HttpException('Too many attempts. Wait a minute and try again.', 429);
    return this.admin.resetPassword(b); // the link's secret is 256 random bits, so it cannot be guessed
  }
  @UseGuards(AdminGuard) @Post('me/resend-verification') @HttpCode(200)
  resend(@CurrentUser() u: SessionUser) {
    if (!this.emails.allow(u.id)) throw new HttpException('We just sent one. Wait a minute before asking again.', 429);
    return this.admin.resendVerification(u);
  }

  @UseGuards(AdminGuard) @Get('me') me(@CurrentUser() u: SessionUser) { return this.admin.me(u); }
  @UseGuards(AdminGuard) @Post('me/password') @HttpCode(200) changePassword(@CurrentUser() u: SessionUser, @Body() b: Json) { return this.admin.changePassword(u, b); }
  @UseGuards(AdminGuard) @Get('overview') overview(@CurrentUser() u: SessionUser) { return this.admin.overview(u); }
  @UseGuards(AdminGuard) @Get('options') options() { return this.admin.options(); }

  // Listings: staff, and owners/agents limited to their own. Builder logins have no listings.
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Get('properties') properties(@CurrentUser() u: SessionUser, @Query() q: { q?: string; state?: string; page?: string }) { return this.admin.properties(u, q); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Get('properties/:id') property(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.property(u, id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Post('properties') createProperty(@CurrentUser() u: SessionUser, @Body() b: Json) { return this.admin.createProperty(u, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Patch('properties/:id') updateProperty(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.admin.updateProperty(u, id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Delete('properties/:id') deleteProperty(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.deleteProperty(u, id); }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Post('properties/:id/photos')
  @UseInterceptors(FilesInterceptor('photos', MAX_PHOTOS_PER_LISTING, { limits: { fileSize: MAX_PHOTO_BYTES } }))
  addPhotos(@CurrentUser() u: SessionUser, @Param('id') id: string, @UploadedFiles() files: Upload[]) { return this.admin.addPhotos(u, id, files); }
  @UseGuards(AdminGuard) @Get('enquiries') enquiries(@CurrentUser() u: SessionUser, @Query() q: { page?: string; kind?: string; project?: string; status?: string }) { return this.admin.enquiries(u, q); }
  @UseGuards(AdminGuard) @Patch('enquiries/:id') updateEnquiry(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.admin.updateEnquiry(u, id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'BUILDER') @Get('enquiries.csv') @Header('content-type', 'text/csv; charset=utf-8') enquiriesCsv(@CurrentUser() u: SessionUser, @Query() q: { kind?: string; project?: string }) { return this.admin.enquiriesCsv(u, q); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR', 'AGENT') @Delete('photos/:id') deletePhoto(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.deletePhoto(u, id); }

  // Staff only from here.
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('properties/:id/review') @HttpCode(200) review(@Param('id') id: string, @Body() b: Json) { return this.admin.review(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('import/properties') @HttpCode(200) importProperties(@CurrentUser() u: SessionUser, @Body() b: { csv?: unknown }) { return this.admin.importProperties(u, b?.csv); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('import/sample.csv') @Header('content-type', 'text/csv; charset=utf-8') sample() { return IMPORT_SAMPLE; }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('questions') questions(@Query() q: { only?: string; page?: string }) { return this.admin.questions(q); }

  // Agents and the projects they sell. The first four are for the agent; the last two for our team.
  @UseGuards(AdminGuard) @Get('selling') mySelling(@CurrentUser() u: SessionUser) { return this.admin.mySelling(u); }
  @UseGuards(AdminGuard) @Get('selling/projects') findProjects(@Query('q') q: string) { return this.admin.findProjects(q); }
  @UseGuards(AdminGuard) @Post('selling') requestSelling(@CurrentUser() u: SessionUser, @Body() b: Json) { return this.admin.requestSelling(u, b); }
  @UseGuards(AdminGuard) @Delete('selling/:id') stopSelling(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.admin.stopSelling(u, id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('project-sellers') projectSellers(@Query() q: { status?: string }) { return this.admin.projectSellers(q); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('project-sellers/:id/decide') @HttpCode(200) decideProjectSeller(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.admin.decideProjectSeller(u, id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('builder-pages') builderPages() { return this.admin.builderPages(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('builder-pages/:id') builderPage(@Param('id') id: string) { return this.admin.builderPage(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Patch('builder-pages/:id') renameBuilderPage(@Param('id') id: string, @Body() b: Json) { return this.admin.renameBuilderPage(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('builder-pages/:id/merge') @HttpCode(200) mergeBuilderPage(@Param('id') id: string, @Body() b: Json) { return this.admin.mergeBuilderPage(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('builders') builders() { return this.admin.builders(); }
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

  /** Who is due a reminder about leads left New. `send: "true"` emails them now; otherwise it only reports. Admins only. */
  @UseGuards(AdminGuard) @Roles('ADMIN') @Post('reminders/run') @HttpCode(200)
  runReminders(@Body() b: { send?: unknown }) { return this.reminders.run(b?.send === 'true' || b?.send === true); }

  // Users: admins only.
  @UseGuards(AdminGuard) @Roles('ADMIN') @Get('users') users() { return this.admin.users(); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Get('users/:id') user(@Param('id') id: string) { return this.admin.user(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Post('users') createUser(@Body() b: Json) { return this.admin.createUser(b); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Patch('users/:id') updateUser(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.admin.updateUser(u, id, b); }
}
