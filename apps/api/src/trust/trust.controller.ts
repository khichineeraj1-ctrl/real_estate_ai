import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AdminGuard, CurrentUser, Roles, SessionUser } from '../admin/auth';
import { MAX_DOCUMENT_BYTES } from './documents';
import { TrustService } from './trust.service';

type Json = Record<string, unknown>;

@Controller()
export class TrustController {
  constructor(private readonly trust: TrustService) {}

  /** A seller's public card: name, how long with us, and how far we have verified them. */
  @Get('dealers/:id')
  async publicDealer(@Param('id') id: string) {
    const d = await this.trust.publicDealer(id);
    if (!d) throw new NotFoundException('Seller not found');
    return d;
  }

  // The seller's own onboarding.
  @UseGuards(AdminGuard) @Roles('AGENT') @Get('admin/dealer/profile') myProfile(@CurrentUser() u: SessionUser) { return this.trust.myProfile(u); }
  @UseGuards(AdminGuard) @Roles('AGENT') @Put('admin/dealer/profile') saveProfile(@CurrentUser() u: SessionUser, @Body() b: Json) { return this.trust.saveProfile(u, b); }
  @UseGuards(AdminGuard) @Roles('AGENT') @Post('admin/dealer/profile/submit') @HttpCode(200) submit(@CurrentUser() u: SessionUser) { return this.trust.submitProfile(u); }
  @UseGuards(AdminGuard) @Roles('AGENT') @Post('admin/dealer/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  addDocument(@CurrentUser() u: SessionUser, @Body() b: { kind?: unknown }, @UploadedFile() file: { buffer: Buffer; size: number } | undefined) { return this.trust.addDocument(u, b?.kind, file); }

  // Documents: the seller they belong to, or staff. Never cached, never public.
  @UseGuards(AdminGuard) @Roles('AGENT', 'ADMIN', 'EDITOR') @Delete('admin/documents/:id') removeDocument(@CurrentUser() u: SessionUser, @Param('id') id: string) { return this.trust.removeDocument(u, id); }
  @UseGuards(AdminGuard) @Roles('AGENT', 'ADMIN', 'EDITOR') @Get('admin/documents/:id/file')
  async file(@CurrentUser() u: SessionUser, @Param('id') id: string, @Res() res: Response) {
    const doc = await this.trust.documentFile(u, id);
    res.set({ 'content-type': doc.mime, 'content-disposition': `inline; filename="${doc.kind.toLowerCase()}"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' });
    res.send(doc.data);
  }

  // Staff review.
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/dealers') dealers(@Query() q: { status?: string }) { return this.trust.dealers(q); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/dealers/:userId') dealer(@Param('userId') userId: string) { return this.trust.dealerForReview(userId); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/dealers/:userId/review') @HttpCode(200) review(@CurrentUser() u: SessionUser, @Param('userId') userId: string, @Body() b: Json) { return this.trust.review(u, userId, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/dealers/:userId/documents/purge') @HttpCode(200) purge(@Param('userId') userId: string) { return this.trust.purgeDocuments(userId); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/properties/:id/verify') @HttpCode(200) verify(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() b: Json) { return this.trust.verifyProperty(u, id, b); }
  @UseGuards(AdminGuard) @Roles('ADMIN') @Post('admin/confidence/refresh') @HttpCode(200) refresh() { return this.trust.refreshAll(); }
}
