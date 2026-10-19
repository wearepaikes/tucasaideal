import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { R2StorageService } from './r2-storage.service';

@Module({ imports: [AuthModule], controllers: [AdminController], providers: [AdminService, R2StorageService] })
export class AdminModule {}
