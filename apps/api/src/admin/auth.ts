import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_HOURS = 12;
// Without ADMIN_SECRET the key is random per start, so sessions simply end when the API restarts.
const secret = process.env.ADMIN_SECRET || randomBytes(32).toString('hex');
const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('base64url');
const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export const adminConfigured = () => !!process.env.ADMIN_EMAIL && !!process.env.ADMIN_PASSWORD;

export function checkLogin(email: string, password: string): boolean {
  if (!adminConfigured()) return false;
  // Both comparisons always run, so timing does not reveal which half was wrong.
  const okEmail = same(email.trim().toLowerCase(), process.env.ADMIN_EMAIL!.trim().toLowerCase());
  const okPassword = same(password, process.env.ADMIN_PASSWORD!);
  return okEmail && okPassword;
}

export function issueToken(now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_HOURS * 3_600_000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra !== undefined || !same(mac, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: unknown };
    return typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const header = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers.authorization ?? '';
    if (!verifyToken(header.startsWith('Bearer ') ? header.slice(7) : undefined)) throw new UnauthorizedException('Sign in to the admin panel');
    return true;
  }
}
