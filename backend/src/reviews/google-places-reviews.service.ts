import { BadGatewayException, ForbiddenException, HttpException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGateway } from '../auth/auth.gateway';
import { PrismaService } from '../prisma/prisma.service';

type GoogleReview = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  publishTime?: string;
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};

type GooglePlace = {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
  error?: { message?: string };
};

@Injectable()
export class GooglePlacesReviewsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GooglePlacesReviewsService.name);
  private readonly staleAfterMs = 6 * 60 * 60 * 1000;
  private lastSyncAt = 0;
  private syncPromise?: Promise<{ imported: number; rating?: number; total?: number; place?: string }>;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gateway: AuthGateway,
  ) {}

  onModuleInit() {
    const startup = setTimeout(() => void this.sync(false).catch(() => undefined), 5000);
    startup.unref();
    this.timer = setInterval(() => void this.sync(false).catch(() => undefined), this.staleAfterMs);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async publicReviews() {
    await this.sync(false).catch(() => undefined);
    return (this.prisma as any).googleReview.findMany({
      where: { active: true },
      orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  sync(force = true) {
    if (!force && Date.now() - this.lastSyncAt < this.staleAfterMs) {
      return Promise.resolve({ imported: 0 });
    }
    if (!this.syncPromise) {
      this.syncPromise = this.fetchAndStore(force).finally(() => { this.syncPromise = undefined; });
    }
    return this.syncPromise;
  }

  private async fetchAndStore(throwErrors: boolean) {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY')?.trim();
    const placeId = this.config.get<string>('GOOGLE_PLACE_ID')?.trim();
    if (!apiKey || !placeId) {
      const error = new ServiceUnavailableException('Faltan GOOGLE_PLACES_API_KEY o GOOGLE_PLACE_ID en Railway.');
      if (throwErrors) throw error;
      this.logger.warn(error.message);
      return { imported: 0 };
    }

    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews',
        },
        signal: AbortSignal.timeout(12000),
      });
      const place = await response.json() as GooglePlace;
      if (!response.ok) {
        const googleMessage = place.error?.message || `Google Places respondió ${response.status}.`;
        if (response.status === 403) {
          throw new ForbiddenException(`Google Places rechazó la clave. Verificá que Places API (New), la facturación y las restricciones de la API key estén configuradas en el mismo proyecto. Detalle: ${googleMessage}`);
        }
        throw new Error(googleMessage);
      }

      const sourceReviews = place.reviews || [];
      const reviews = sourceReviews.map((review, index) => {
        const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
        return {
          externalId: review.name || `${review.authorAttribution?.displayName || 'Google'}:${review.publishTime || index}`,
          author: (review.authorAttribution?.displayName || 'Cliente de Google').slice(0, 120),
          rating,
          text: (review.originalText?.text || review.text?.text || `Calificación de ${rating} estrellas en Google.`).trim(),
          reviewDate: review.publishTime ? new Date(review.publishTime) : null,
          authorUri: review.authorAttribution?.uri || null,
          authorPhotoUrl: review.authorAttribution?.photoUri || null,
          googleMapsUri: review.googleMapsUri || place.googleMapsUri || null,
          sortOrder: index,
        };
      });

      await this.prisma.$transaction(async (transaction) => {
        const db = transaction as any;
        await db.businessProfile.upsert({
          where: { id: 1 },
          create: { id: 1, googleRating: place.rating ?? null, googleReviewCount: place.userRatingCount ?? null, googleMapsUri: place.googleMapsUri || null, googleReviewsSyncedAt: new Date() },
          update: { googleRating: place.rating ?? null, googleReviewCount: place.userRatingCount ?? null, googleMapsUri: place.googleMapsUri || null, googleReviewsSyncedAt: new Date() },
        });
        for (const review of reviews) {
          const { externalId, ...reviewData } = review;
          await db.googleReview.upsert({
            where: { googleReviewId: externalId },
            create: { ...reviewData, googleReviewId: externalId, source: 'GOOGLE', active: true },
            update: reviewData,
          });
        }
      });

      this.lastSyncAt = Date.now();
      this.gateway.notifyReviewsChanged({ action: 'synced', reviewId: 0 });
      this.logger.log(`Google Places devolvió ${sourceReviews.length} reseñas; se importaron ${reviews.length}.`);
      return { imported: reviews.length, received: sourceReviews.length, rating: place.rating, total: place.userRatingCount, place: place.displayName?.text };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo consultar Google Places.';
      this.logger.warn(`Sincronización de reseñas: ${message}`);
      this.lastSyncAt = Date.now();
      if (throwErrors && error instanceof HttpException) throw error;
      if (throwErrors) throw new BadGatewayException(message);
      return { imported: 0 };
    }
  }
}
