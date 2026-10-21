import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { R2StorageService } from './r2-storage.service';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({ imports: [AuthModule, ReviewsModule], controllers: [AdminController], providers: [AdminService, R2StorageService] })
export class AdminModule {}
