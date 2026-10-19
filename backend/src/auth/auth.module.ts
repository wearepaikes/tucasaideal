import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthGateway } from './auth.gateway';

@Module({
  imports: [JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET'), signOptions: { issuer: 'tu-casa-ideal', audience: 'administracion' } }) })],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuthGateway],
  exports: [AuthService, AuthGuard, AuthGateway],
})
export class AuthModule {}
