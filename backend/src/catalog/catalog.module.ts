import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({ imports: [ReviewsModule], controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
