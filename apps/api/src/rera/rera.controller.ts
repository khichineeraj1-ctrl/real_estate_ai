import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RegisterSource } from '@prisma/client';
import { AdminGuard, Roles } from '../admin/auth';
import { RegisterService } from './rera.service';

/** Reading the RERA registers and publishing their entries as project pages. Admins start a read; staff place entries. */
@Controller('admin/register')
export class RegisterController {
  constructor(private readonly register: RegisterService) {}

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get() overview() { return this.register.overview(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('entries') list(@Query() q: { source?: string; q?: string; placed?: string; page?: string }) { return this.register.list(q); }

  @UseGuards(AdminGuard) @Roles('ADMIN') @Post('read') @HttpCode(200)
  read(@Body() b: { source?: unknown; maxPages?: unknown }) {
    const source = Object.values(RegisterSource).find((s) => s === b?.source);
    if (!source) throw new BadRequestException('Choose which register to read');
    const maxPages = Number(b?.maxPages);
    return this.register.start(source, { maxPages: Number.isInteger(maxPages) ? maxPages : undefined });
  }

  /** Re-applies the placement rules to pages that were placed automatically. */
  @UseGuards(AdminGuard) @Roles('ADMIN') @Post('recheck') @HttpCode(200)
  recheck(@Body() b: { source?: unknown }) {
    const source = Object.values(RegisterSource).find((s) => s === b?.source);
    if (!source) throw new BadRequestException('Choose which register to re-check');
    return this.register.recheck(source);
  }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('entries/:id/publish') @HttpCode(200) publish(@Param('id') id: string, @Body() b: { localityId?: unknown }) { return this.register.publishTo(id, b?.localityId); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('entries/:id/unpublish') @HttpCode(200) unpublish(@Param('id') id: string) { return this.register.unpublish(id); }
}
