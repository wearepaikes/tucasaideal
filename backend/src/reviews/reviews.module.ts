import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GooglePlacesReviewsService } from './google-places-reviews.service';

@Module({
  imports: [AuthModule],
  providers: [GooglePlacesReviewsService],
  exports: [GooglePlacesReviewsService],
})
export class ReviewsModule {}
