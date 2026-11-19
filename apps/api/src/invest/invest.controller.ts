import { Body, Controller, Delete, Get, HttpCode, HttpException, Ip, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard, Roles } from '../admin/auth';
import { Limiter } from '../ask/ask.service';
import { InvestService } from './invest.service';

type Json = Record<string, unknown>;
const slugOk = (v?: string) => (v && /^[a-z0-9-]{1,90}$/.test(v) ? v : undefined);

@Controller()
export class InvestController {
  private notes = new Limiter(4, 5_000);
  constructor(private readonly invest: InvestService) {}
  private guard(body: Json | undefined, ip: string) {
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!this.notes.allow(who)) throw new HttpException('Too many requests in a short time. Please try again in a minute.', 429);
  }

  @Get('invest/options') options() { return this.invest.options(); }
  @Get('invest') list(@Query() q: { state?: string; driver?: string }) { return this.invest.list({ state: slugOk(q.state), driver: q.driver }); }
  @Post('invest/interest') @HttpCode(200) general(@Body() b: Json, @Ip() ip: string) { this.guard(b, ip); return this.invest.interest(null, b ?? {}); }
  @Get('invest/:slug') one(@Param('slug') slug: string) { return this.invest.one(slug); }
  @Post('invest/:slug/interest') @HttpCode(200) interest(@Param('slug') slug: string, @Body() b: Json, @Ip() ip: string) { this.guard(b, ip); return this.invest.interest(slug, b ?? {}); }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/invest') all() { return this.invest.all(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/invest/waiting') waiting() { return this.invest.waiting(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/invest/interests') interests(@Query('status') status?: string) { return this.invest.interests(status); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/invest/interests/:id/done') @HttpCode(200) done(@Param('id') id: string) { return this.invest.interestDone(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/invest') create(@Body() b: Json) { return this.invest.save(null, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/invest/:id') edit(@Param('id') id: string) { return this.invest.forEdit(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Put('admin/invest/:id') update(@Param('id') id: string, @Body() b: Json) { return this.invest.save(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/invest/:id/publish') @HttpCode(200) publish(@Param('id') id: string, @Body() b: Json) { return this.invest.publish(id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Delete('admin/invest/:id') remove(@Param('id') id: string) { return this.invest.remove(id); }
}
