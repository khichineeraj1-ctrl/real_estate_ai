import { Body, Controller, Delete, Get, HttpCode, HttpException, Ip, Param, Patch, Post, Query, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Limiter } from '../ask/ask.service';
import { AdminGuard, adminConfigured, checkLogin, issueToken } from './auth';
import { AdminService } from './admin.service';

type Body_ = Record<string, unknown>;

@Controller('admin')
export class AdminController {
  // A handful of sign-in attempts per minute per address makes password guessing impractical.
  private attempts = new Limiter(5, 100_000);
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email?: unknown; password?: unknown }, @Ip() ip: string) {
    if (!adminConfigured()) throw new ServiceUnavailableException('The admin panel is not set up: ADMIN_EMAIL and ADMIN_PASSWORD are missing on the API');
    if (!this.attempts.allow(ip)) throw new HttpException('Too many sign-in attempts. Wait a minute and try again.', 429);
    if (typeof body?.email !== 'string' || typeof body?.password !== 'string' || !checkLogin(body.email, body.password)) throw new UnauthorizedException('Wrong email or password');
    return { token: issueToken() };
  }

  @UseGuards(AdminGuard) @Get('overview') overview() { return this.admin.overview(); }
  @UseGuards(AdminGuard) @Get('options') options() { return this.admin.options(); }
  @UseGuards(AdminGuard) @Get('questions') questions(@Query() q: { only?: string; page?: string }) { return this.admin.questions(q); }

  @UseGuards(AdminGuard) @Get('properties') properties(@Query() q: { q?: string; city?: string; page?: string }) { return this.admin.properties(q); }
  @UseGuards(AdminGuard) @Get('properties/:id') property(@Param('id') id: string) { return this.admin.property(id); }
  @UseGuards(AdminGuard) @Post('properties') createProperty(@Body() b: Body_) { return this.admin.createProperty(b); }
  @UseGuards(AdminGuard) @Patch('properties/:id') updateProperty(@Param('id') id: string, @Body() b: Body_) { return this.admin.updateProperty(id, b); }
  @UseGuards(AdminGuard) @Delete('properties/:id') deleteProperty(@Param('id') id: string) { return this.admin.deleteProperty(id); }

  @UseGuards(AdminGuard) @Get('projects') projects() { return this.admin.projects(); }
  @UseGuards(AdminGuard) @Get('projects/:id') project(@Param('id') id: string) { return this.admin.project(id); }
  @UseGuards(AdminGuard) @Post('projects') createProject(@Body() b: Body_) { return this.admin.createProject(b); }
  @UseGuards(AdminGuard) @Patch('projects/:id') updateProject(@Param('id') id: string, @Body() b: Body_) { return this.admin.updateProject(id, b); }
  @UseGuards(AdminGuard) @Delete('projects/:id') deleteProject(@Param('id') id: string) { return this.admin.deleteProject(id); }

  @UseGuards(AdminGuard) @Get('localities') localities() { return this.admin.localities(); }
  @UseGuards(AdminGuard) @Get('localities/:id') locality(@Param('id') id: string) { return this.admin.locality(id); }
  @UseGuards(AdminGuard) @Post('localities') createLocality(@Body() b: Body_) { return this.admin.createLocality(b); }
  @UseGuards(AdminGuard) @Patch('localities/:id') updateLocality(@Param('id') id: string, @Body() b: Body_) { return this.admin.updateLocality(id, b); }
  @UseGuards(AdminGuard) @Delete('localities/:id') deleteLocality(@Param('id') id: string) { return this.admin.deleteLocality(id); }

  @UseGuards(AdminGuard) @Get('cities') cities() { return this.admin.cities(); }
  @UseGuards(AdminGuard) @Get('cities/:id') city(@Param('id') id: string) { return this.admin.city(id); }
  @UseGuards(AdminGuard) @Post('cities') createCity(@Body() b: Body_) { return this.admin.createCity(b); }
  @UseGuards(AdminGuard) @Patch('cities/:id') updateCity(@Param('id') id: string, @Body() b: Body_) { return this.admin.updateCity(id, b); }
  @UseGuards(AdminGuard) @Delete('cities/:id') deleteCity(@Param('id') id: string) { return this.admin.deleteCity(id); }
}
