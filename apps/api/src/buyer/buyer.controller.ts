import { Body, Controller, Delete, Get, Headers, HttpCode, HttpException, Ip, Param, Post, Put } from '@nestjs/common';
import { Limiter } from '../ask/ask.service';
import { AlertService } from '../catalog/alerts';
import { BuyerService, cleanEmail } from './buyer.service';

/** A buyer's own account. Every route but the two sign-in ones needs their session token. */
@Controller('me')
export class BuyerController {
  constructor(private readonly buyers: BuyerService, private readonly alerts: AlertService) {}
  private codes = new Limiter(3, 2_000); // per email: codes cost money to send and can be used to pester someone
  private perAddress = new Limiter(10, 20_000);
  private tries = new Limiter(10, 50_000);

  @Post('code') @HttpCode(200)
  code(@Body() b: { email?: unknown; visitor?: unknown }, @Ip() ip: string) {
    const who = typeof b?.visitor === 'string' && b.visitor ? b.visitor.slice(0, 64) : ip;
    if (!this.perAddress.allow(who) || !this.codes.allow(cleanEmail(b?.email) ?? who)) throw new HttpException('Too many codes asked for. Please wait a minute and try again.', 429);
    return this.buyers.sendCode(b?.email);
  }
  @Post('verify') @HttpCode(200)
  verify(@Body() b: { email?: unknown; code?: unknown; visitor?: unknown }, @Ip() ip: string) {
    const who = typeof b?.visitor === 'string' && b.visitor ? b.visitor.slice(0, 64) : ip;
    if (!this.tries.allow(who)) throw new HttpException('Too many tries. Please wait a minute.', 429);
    return this.buyers.verify(b?.email, b?.code);
  }

  @Get() async me(@Headers('authorization') auth?: string) { const b = await this.buyers.need(auth); return { ...(await this.buyers.me(b.id)), ...(await this.alerts.mine(b)) }; }
  @Delete('alerts/:id') async stopAlert(@Headers('authorization') auth: string | undefined, @Param('id') id: string) { return this.alerts.removeMine(await this.buyers.need(auth), 'alert', id); }
  @Delete('follows/:id') async stopFollow(@Headers('authorization') auth: string | undefined, @Param('id') id: string) { return this.alerts.removeMine(await this.buyers.need(auth), 'follow', id); }
  @Post('signout') @HttpCode(200) signOut(@Headers('authorization') auth?: string) { return this.buyers.signOut(auth); }
  @Post('saved') @HttpCode(200) async save(@Headers('authorization') auth: string | undefined, @Body() b: { kind?: unknown; slug?: unknown; note?: unknown }) { return this.buyers.save((await this.buyers.need(auth)).id, b ?? {}); }
  @Delete('saved/:kind/:slug') async unsave(@Headers('authorization') auth: string | undefined, @Param('kind') kind: string, @Param('slug') slug: string) { return this.buyers.unsave((await this.buyers.need(auth)).id, kind, slug); }
  @Put('state') async state(@Headers('authorization') auth: string | undefined, @Body() b: { state?: unknown }) { return this.buyers.setState((await this.buyers.need(auth)).id, b?.state); }
  @Delete() async remove(@Headers('authorization') auth?: string) { return this.buyers.remove((await this.buyers.need(auth)).id); }
}
