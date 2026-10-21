import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GooglePlacesReviewsService } from '../reviews/google-places-reviews.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly reviews: GooglePlacesReviewsService) {}
  models() { return this.prisma.houseModel.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }); }
  works() { return this.prisma.work.findMany({ where: { active: true }, orderBy: { deliveredAt: 'desc' } }); }
  projects() { return this.prisma.project.findMany({ where: { active: true }, orderBy: { id: 'asc' } }); }
  googleReviews() { return this.reviews.publicReviews(); }
  async businessProfile() {
    const profile = await this.prisma.businessProfile.findUnique({ where: { id: 1 } });
    const publishedHouses = await this.prisma.work.count({ where: { active: true } });
    if (!profile) return { years: 0, houseCount: publishedHouses, googleRating: null, googleReviewCount: 0, googleMapsUri: null };
    let years = profile.manualServiceYears ?? 0;
    if (profile.serviceYearsMode !== 'MANUAL' && profile.serviceStartDate) {
      const now = new Date();
      years = now.getFullYear() - profile.serviceStartDate.getFullYear();
      const anniversary = new Date(now.getFullYear(), profile.serviceStartDate.getMonth(), profile.serviceStartDate.getDate());
      if (now < anniversary) years -= 1;
    }
    return { years: Math.max(0, years), houseCount: profile.houseCountMode === 'MANUAL' ? profile.manualHouseCount ?? 0 : publishedHouses, googleRating: profile.googleRating, googleReviewCount: profile.googleReviewCount ?? 0, googleMapsUri: profile.googleMapsUri };
  }
}
