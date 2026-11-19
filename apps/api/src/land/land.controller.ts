import { Body, Controller, Get, HttpCode, HttpException, Ip, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MAX_PHOTO_BYTES } from '../admin/photos';
import { AdminGuard, Roles } from '../admin/auth';
import { Limiter } from '../ask/ask.service';
import { LandService, MAX_LAND_PHOTOS } from './land.service';
import { MIN_LONG, MIN_SHORT, MAX_SHAPE, PHOTO_TIPS } from './photo-rules';
import { FEATURES, KINDS, KIND_LABEL, LAND_USES, LOCAL_UNITS, PURPOSES, PURPOSE_LABEL, STATES, UNITS, UNIT_LABEL } from './rules';

type Json = Record<string, unknown>;
const slugOk = (v?: string) => (v && /^[a-z0-9-]{1,90}$/.test(v) ? v : undefined);

@Controller()
export class LandController {
  // Posting is rare for a real person; a handful a minute per visitor stops a script filling the review queue.
  private posts = new Limiter(3, 2_000);
  private replies = new Limiter(4, 5_000);
  private uploads = new Limiter(30, 20_000);
  constructor(private readonly land: LandService) {}
  private guard(limit: Limiter, body: Json | undefined, ip: string) {
    const who = typeof body?.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    if (!limit.allow(who)) throw new HttpException('Too many requests in a short time. Please try again in a minute.', 429);
  }

  /** Everything a form needs to draw itself, so the website and the app offer the same choices. */
  @Get('land/options') options() {
    return { states: STATES, kinds: KINDS.map((k) => ({ code: k, label: KIND_LABEL[k] })), purposes: PURPOSES.map((p) => ({ code: p, label: PURPOSE_LABEL[p] })),
      units: UNITS.map((u) => ({ code: u, label: UNIT_LABEL[u][0], local: (LOCAL_UNITS as readonly string[]).includes(u) })), landUses: LAND_USES, features: Object.entries(FEATURES).map(([code, label]) => ({ code, label })),
      photo: { minLong: MIN_LONG, minShort: MIN_SHORT, maxShape: MAX_SHAPE, max: MAX_LAND_PHOTOS, tips: PHOTO_TIPS } };
  }
  @Get('land/places') places() { return this.land.places(); }
  @Get('land') list(@Query() q: { kind?: string; deal?: string; state?: string; district?: string; take?: string }) {
    return this.land.list({ kind: q.kind, deal: q.deal, state: slugOk(q.state), district: slugOk(q.district), take: Number(q.take) || undefined });
  }
  @Post('land') post(@Body() b: Json, @Ip() ip: string) { this.guard(this.posts, b, ip); return this.land.post(b ?? {}); }
  @Get('land/wanted') wanted(@Query() q: { state?: string; kind?: string; take?: string }) { return this.land.wantedList({ state: slugOk(q.state), kind: q.kind, take: Number(q.take) || undefined }); }
  @Post('land/wanted') wantedPost(@Body() b: Json, @Ip() ip: string) { this.guard(this.posts, b, ip); return this.land.wantedPost(b ?? {}); }
  @Get('land/wanted/:slug') wantedOne(@Param('slug') slug: string) { return this.land.wantedOne(slug); }
  @Post('land/wanted/:slug/answer') @HttpCode(200) answer(@Param('slug') slug: string, @Body() b: Json, @Ip() ip: string) { this.guard(this.replies, b, ip); return this.land.answer(slug, b ?? {}); }
  @Post('land/manage') @HttpCode(200) manage(@Body() b: { token?: string; close?: boolean }) { return b?.close ? this.land.close(b.token ?? '') : this.land.manage(b?.token ?? ''); }
  /** Photos for a listing, sent with the poster's private key. The key is the permission; the limit only slows a script. */
  @Post('land/photos') @HttpCode(200) @UseInterceptors(FilesInterceptor('photos', MAX_LAND_PHOTOS, { limits: { fileSize: MAX_PHOTO_BYTES } }))
  addPhotos(@UploadedFiles() files: { buffer: Buffer; size: number }[], @Body() b: Json, @Ip() ip: string) {
    if (!this.uploads.allow(ip)) throw new HttpException('Too many uploads in a short time. Please try again in a minute.', 429);
    return this.land.addPhotos(String(b?.token ?? ''), files);
  }
  @Post('land/photos/remove') @HttpCode(200) removePhoto(@Body() b: { token?: string; file?: string }) { return this.land.removePhoto(b?.token ?? '', b?.file ?? ''); }
  @Get('land/listing/:slug') one(@Param('slug') slug: string) { return this.land.one(slug); }
  @Post('land/listing/:slug/enquire') @HttpCode(200) enquire(@Param('slug') slug: string, @Body() b: Json, @Ip() ip: string) { this.guard(this.replies, b, ip); return this.land.enquire(slug, b ?? {}); }

  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/land') queue(@Query('status') status?: string) { return this.land.queue(status); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/land/waiting') waiting() { return this.land.waiting(); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Get('admin/land/replies') allReplies(@Query('status') status?: string) { return this.land.replies(status); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/land/replies/:id/done') @HttpCode(200) done(@Param('id') id: string) { return this.land.replyDone(id); }
  @UseGuards(AdminGuard) @Roles('ADMIN', 'EDITOR') @Post('admin/land/:type/:id/decide') @HttpCode(200) decide(@Param('type') type: string, @Param('id') id: string, @Body() b: Json) { return this.land.decide(type, id, b); }
}
