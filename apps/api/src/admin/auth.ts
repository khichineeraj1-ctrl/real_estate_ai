import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_HOURS = 12;
// Without ADMIN_SECRET the key is random per start, so sessions simply end when the API restarts.
const secret = process.env.ADMIN_SECRET || randomBytes(32).toString('hex');
const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('base64url');
const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export const normalEmail = (email: string) => email.trim().toLowerCase();

/** Passwords are stored as a salted scrypt hash, never as text. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  return same(scryptSync(password, salt, 64).toString('hex'), hash);
}

/** A short fingerprint of the password hash, carried in the session so that changing or resetting a password ends every older session. */
export const passwordKey = (passwordHash: string) => createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16);

export function issueToken(user: { id: string; passwordHash: string }, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, k: passwordKey(user.passwordHash), exp: now + SESSION_HOURS * 3_600_000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** A random secret for a link sent by email, and the hash of it that is stored. */
export function emailSecret(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('base64url');
  return { secret, hash: hashEmailSecret(secret) };
}
export const hashEmailSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

/** The user id and password fingerprint inside a valid, unexpired token; null for anything else. */
export function readToken(token: string | undefined, now = Date.now()): { sub: string; k: string } | null {
  if (!token) return null;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra !== undefined || !same(mac, sign(payload))) return null;
  try {
    const { sub, k, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: unknown; k?: unknown; exp?: unknown };
    return typeof sub === 'string' && typeof k === 'string' && typeof exp === 'number' && exp > now ? { sub, k } : null;
  } catch {
    return null;
  }
}

export interface SessionUser { id: string; email: string; name: string; role: Role; emailVerified: boolean }
export const STAFF: Role[] = ['ADMIN', 'EDITOR'];
export const isStaff = (u: SessionUser) => STAFF.includes(u.role);

/** Limits a route to these roles. Without it, any signed-in user may call the route. */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ user: SessionUser }>().user);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly db: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: SessionUser }>();
    const header = req.headers.authorization ?? '';
    const session = readToken(header.startsWith('Bearer ') ? header.slice(7) : undefined);
    // Looked up on every request, so a deactivated account, a changed role or a changed password takes effect immediately.
    const user = session ? await this.db.user.findUnique({ where: { id: session.sub }, select: { id: true, email: true, name: true, role: true, active: true, passwordHash: true, emailVerified: true } }) : null;
    if (!user?.active || !session || !same(session.k, passwordKey(user.passwordHash))) throw new UnauthorizedException('Sign in to continue');
    const roles = this.reflector.get<Role[] | undefined>('roles', ctx.getHandler());
    if (roles && !roles.includes(user.role)) throw new ForbiddenException('Your account is not allowed to do this');
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.emailVerified };
    return true;
  }
}
