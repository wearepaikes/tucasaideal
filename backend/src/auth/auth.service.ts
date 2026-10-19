import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

type SessionPayload = { purpose: 'session'; sub: number; role: 'ADMIN' | 'DIRECTOR'; email: string };
type PendingPayload = { purpose: 'pending-registration'; sub: number; email: string };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  private tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async createAccessLink() {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.portalAccess.create({ data: { tokenHash: this.tokenHash(token) } });
    return { url: `${this.config.get('FRONTEND_URL', 'http://localhost:5173')}/acceso/${token}`, permanent: true };
  }

  async verifyAccess(token: string) {
    if (!token) throw new UnauthorizedException('El enlace de acceso no es válido.');
    const access = await this.prisma.portalAccess.findUnique({ where: { tokenHash: this.tokenHash(token) } });
    if (!access || access.revokedAt) throw new UnauthorizedException('El enlace de acceso no es válido o fue revocado.');
    await this.prisma.portalAccess.update({ where: { id: access.id }, data: { lastUsedAt: new Date() } });
    return access;
  }

  async register(dto: RegisterDto) {
    await this.verifyAccess(dto.accessToken);
    if (dto.password !== dto.confirmPassword) throw new BadRequestException('Las contraseñas no coinciden.');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new BadRequestException('El correo ya está registrado.');
    const count = await this.prisma.user.count();
    const user = await this.prisma.user.create({ data: { firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), email, passwordHash: await hash(dto.password, 12), role: count === 0 ? 'ADMIN' : 'DIRECTOR', active: count === 0 } });
    return count === 0 ? { status: 'active' as const, ...this.session(user) } : this.pending(user);
  }

  async login(dto: LoginDto) {
    await this.verifyAccess(dto.accessToken);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !user.passwordHash || !(await compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    if (!user.active) throw new UnauthorizedException('Tu cuenta todavía está pendiente de aprobación.');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.session(user);
  }

  session(user: { id: number; email: string; role: 'ADMIN' | 'DIRECTOR'; firstName: string; lastName: string }) {
    const token = this.jwt.sign({ purpose: 'session', sub: user.id, role: user.role, email: user.email } satisfies SessionPayload, { expiresIn: '8h' });
    return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
  }

  verifySession(token: string) {
    try {
      const payload = this.jwt.verify<SessionPayload>(token);
      if (payload.purpose !== 'session') throw new Error('purpose');
      return payload;
    } catch { throw new UnauthorizedException('Sesión inválida o expirada.'); }
  }

  verifyPendingToken(token: string) {
    try {
      const payload = this.jwt.verify<PendingPayload>(token);
      if (payload.purpose !== 'pending-registration') throw new Error('purpose');
      return payload;
    } catch { throw new UnauthorizedException('Solicitud de registro inválida o expirada.'); }
  }

  private pending(user: { id: number; email: string; firstName: string; lastName: string; createdAt: Date }) {
    const pendingToken = this.jwt.sign({ purpose: 'pending-registration', sub: user.id, email: user.email } satisfies PendingPayload, { expiresIn: '7d' });
    return { status: 'pending' as const, pendingToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, createdAt: user.createdAt } };
  }

  async authenticatedUser(token: string) {
    const payload = this.verifySession(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.active) throw new UnauthorizedException('La cuenta no está activa.');
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
  }

  async activatePending(token: string) {
    const payload = this.verifyPendingToken(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.active) throw new UnauthorizedException('La cuenta todavía está pendiente de aprobación.');
    return this.session(user);
  }

  pendingUsers() {
    return this.prisma.user.findMany({ where: { active: false }, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }

  approveUser(id: number) {
    return this.prisma.user.update({ where: { id }, data: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, role: true } });
  }

  async googleUrl(accessToken: string) {
    await this.verifyAccess(accessToken);
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const callback = this.config.get<string>('GOOGLE_CALLBACK_URL');
    if (!clientId || !callback) throw new BadRequestException('Google OAuth todavía no está configurado.');
    const state = this.jwt.sign({ purpose: 'google-state', accessToken }, { expiresIn: '10m' });
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async googleCallback(code: string, state: string) {
    const statePayload = this.jwt.verify<{ purpose: string; accessToken: string }>(state);
    if (statePayload.purpose !== 'google-state') throw new UnauthorizedException();
    await this.verifyAccess(statePayload.accessToken);
    const callback = this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL');
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'), client_secret: this.config.getOrThrow('GOOGLE_CLIENT_SECRET'), redirect_uri: callback, grant_type: 'authorization_code' }) });
    if (!response.ok) throw new UnauthorizedException('Google no pudo validar el acceso.');
    const tokens = await response.json() as { access_token: string };
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json() as { sub: string; email: string; given_name?: string; family_name?: string };
    const email = profile.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const count = await this.prisma.user.count();
      user = await this.prisma.user.create({ data: { email, googleId: profile.sub, firstName: profile.given_name || 'Usuario', lastName: profile.family_name || '', role: count === 0 ? 'ADMIN' : 'DIRECTOR', active: count === 0 } });
    } else if (!user.googleId) user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: profile.sub, lastLoginAt: new Date() } });
    if (!user.active) return { ...this.pending(user), accessToken: statePayload.accessToken };
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { status: 'active' as const, ...this.session(user), accessToken: statePayload.accessToken };
  }
}
