import { Body, Controller, ForbiddenException, Get, Headers, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AccessTokenDto, LoginDto, PendingTokenDto, RegisterDto } from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthGateway } from './auth.gateway';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly gateway: AuthGateway) {}
  private sessionCookie() { const production = this.config.get('NODE_ENV') === 'production'; return { httpOnly: true, secure: production, sameSite: production ? 'none' as const : 'lax' as const, maxAge: 8 * 60 * 60 * 1000, path: '/' }; }
  private setSession(response: Response, token: string) { response.cookie('tci_session', token, this.sessionCookie()); }

  @Post('access-link') async accessLink(@Headers('x-admin-link-secret') secret: string) {
    if (!secret || secret !== this.config.get('ADMIN_LINK_SECRET')) throw new UnauthorizedException();
    return this.auth.createAccessLink();
  }
  @Post('access/validate') async validate(@Body() dto: AccessTokenDto) { await this.auth.verifyAccess(dto.accessToken); return { valid: true }; }
  @Post('register') async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) { const result = await this.auth.register(dto); if (result.status === 'active') this.setSession(response, result.token); else this.gateway.notifyAdmins(result.user); return result.status === 'active' ? { status: result.status, user: result.user } : result; }
  @Post('login') async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { const result = await this.auth.login(dto); this.setSession(response, result.token); return { user: result.user }; }
  @Get('google') async google(@Query('accessToken') accessToken: string, @Res() response: Response) { return response.redirect(await this.auth.googleUrl(accessToken)); }
  @Get('google/callback') async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() response: Response) { const result = await this.auth.googleCallback(code, state); const destination = `${this.config.get('FRONTEND_URL', 'http://localhost:5173')}/acceso/${result.accessToken}`; if (result.status === 'pending') { this.gateway.notifyAdmins(result.user); return response.redirect(`${destination}?pending=${encodeURIComponent(result.pendingToken)}`); } this.setSession(response, result.token); return response.redirect(`${destination}?google=success`); }
  @UseGuards(AuthGuard) @Get('me') me(@Req() request: Request & { user: unknown }) { return { user: request.user }; }
  @Post('pending/activate') async activatePending(@Body() dto: PendingTokenDto, @Res({ passthrough: true }) response: Response) { const result = await this.auth.activatePending(dto.pendingToken); this.setSession(response, result.token); return { user: result.user }; }
  @UseGuards(AuthGuard) @Get('pending-users') pendingUsers(@Req() request: Request & { user: { role: string } }) { if (request.user.role !== 'ADMIN') throw new ForbiddenException('Solo un administrador puede aprobar cuentas.'); return this.auth.pendingUsers(); }
  @UseGuards(AuthGuard) @Patch('users/:id/approve') async approve(@Param('id', ParseIntPipe) id: number, @Req() request: Request & { user: { role: string } }) { if (request.user.role !== 'ADMIN') throw new ForbiddenException('Solo un administrador puede aprobar cuentas.'); const user = await this.auth.approveUser(id); this.gateway.notifyApproved(user.id); return { user }; }
  @Post('logout') logout(@Res({ passthrough: true }) response: Response) { const cookie = this.sessionCookie(); response.clearCookie('tci_session', { path: cookie.path, secure: cookie.secure, sameSite: cookie.sameSite }); return { success: true }; }
}
