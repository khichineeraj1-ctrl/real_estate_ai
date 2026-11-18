import { BadRequestException, Body, Controller, HttpCode, Ip, Post } from '@nestjs/common';
import { AskService, MAX_MESSAGE, cleanTurns } from './ask.service';

@Controller('ask')
export class AskController {
  constructor(private readonly asks: AskService) {}

  @Post()
  @HttpCode(200)
  ask(@Body() body: { message?: unknown; history?: unknown; visitor?: unknown; context?: unknown }, @Ip() ip: string) {
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) throw new BadRequestException('message is required');
    if (message.length > MAX_MESSAGE * 2) throw new BadRequestException(`message must be under ${MAX_MESSAGE * 2} characters`);
    // The web app asks on a visitor's behalf from its own server, so it passes the visitor's address for rate limiting.
    const who = typeof body.visitor === 'string' && body.visitor ? body.visitor.slice(0, 64) : ip;
    const context = typeof body.context === 'string' ? body.context.replace(/[^\p{L}\p{N} ,.-]/gu, ' ').slice(0, 80) : '';
    return this.asks.ask(who, message, cleanTurns(body.history), context);
  }
}
