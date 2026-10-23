import { BadGatewayException, BadRequestException, ForbiddenException, HttpException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
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

type ReviewCandidate = {
  externalId: string;
  author: string;
  rating: number;
  text: string;
  reviewDate: Date;
  authorUri: string | null;
  authorPhotoUrl: string | null;
  googleMapsUri: string | null;
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

  async replaceWithFreshReview(currentId: number) {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY')?.trim();
    const placeId = this.config.get<string>('GOOGLE_PLACE_ID')?.trim();
    if (!apiKey || !placeId) throw new ServiceUnavailableException('Faltan GOOGLE_PLACES_API_KEY o GOOGLE_PLACE_ID en Railway.');

    const stored = await (this.prisma as any).googleReview.findMany({
      select: { googleReviewId: true, author: true, text: true, reviewDate: true },
    });
    const knownIds = new Set(stored.map((review: any) => review.googleReviewId).filter(Boolean));
    const knownTexts = new Set(stored.map((review: any) => String(review.text || '').trim().toLowerCase()).filter(Boolean));
    const knownAuthorDates = new Set(stored.map((review: any) => `${String(review.author || '').trim().toLowerCase()}|${review.reviewDate ? new Date(review.reviewDate).toISOString().slice(0, 10) : ''}`));
    const candidates: ReviewCandidate[] = [];

    try {
      const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      legacyUrl.searchParams.set('place_id', placeId);
      legacyUrl.searchParams.set('fields', 'name,url,reviews');
      legacyUrl.searchParams.set('reviews_sort', 'newest');
      legacyUrl.searchParams.set('language', 'es');
      legacyUrl.searchParams.set('key', apiKey);
      const response = await fetch(legacyUrl, { signal: AbortSignal.timeout(12000) });
      const payload = await response.json() as any;
      if (response.ok && payload.status === 'OK') {
        for (const review of payload.result?.reviews || []) {
          const reviewDate = new Date(Number(review.time) * 1000);
          candidates.push({
            externalId: `legacy:${review.author_url || review.author_name || 'google'}:${review.time}`,
            author: (review.author_name || 'Cliente de Google').slice(0, 120),
            rating: Math.max(1, Math.min(5, Math.round(review.rating || 5))),
            text: String(review.text || '').trim(),
            reviewDate,
            authorUri: review.author_url || null,
            authorPhotoUrl: review.profile_photo_url || null,
            googleMapsUri: payload.result?.url || null,
          });
        }
      }
    } catch (error) {
      this.logger.warn(`No se pudieron consultar las reseñas más recientes con Places Details: ${error instanceof Error ? error.message : error}`);
    }

    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'googleMapsUri,reviews' },
        signal: AbortSignal.timeout(12000),
      });
      const place = await response.json() as GooglePlace;
      if (!response.ok) throw new Error(place.error?.message || `Google Places respondió ${response.status}.`);
      for (const [index, review] of (place.reviews || []).entries()) {
        const reviewDate = review.publishTime ? new Date(review.publishTime) : new Date(0);
        candidates.push({
          externalId: review.name || `${review.authorAttribution?.displayName || 'Google'}:${review.publishTime || index}`,
          author: (review.authorAttribution?.displayName || 'Cliente de Google').slice(0, 120),
          rating: Math.max(1, Math.min(5, Math.round(review.rating || 5))),
          text: (review.originalText?.text || review.text?.text || '').trim(),
          reviewDate,
          authorUri: review.authorAttribution?.uri || null,
          authorPhotoUrl: review.authorAttribution?.photoUri || null,
          googleMapsUri: review.googleMapsUri || place.googleMapsUri || null,
        });
      }
    } catch (error) {
      if (!candidates.length) {
        throw new BadGatewayException(error instanceof Error ? error.message : 'No fue posible consultar Google Places.');
      }
      this.logger.warn(`No se pudo completar la consulta adicional de Places API: ${error instanceof Error ? error.message : error}`);
    }

    const recentLimit = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
    const eligible = candidates
      .filter((review) => review.rating >= 4 && review.text && review.reviewDate.valueOf() >= recentLimit)
      .filter((review) => !knownIds.has(review.externalId) && !knownTexts.has(review.text.toLowerCase()) && !knownAuthorDates.has(`${review.author.trim().toLowerCase()}|${review.reviewDate.toISOString().slice(0, 10)}`))
      .sort((a, b) => b.reviewDate.valueOf() - a.reviewDate.valueOf())
      .slice(0, 3);
    if (!eligible.length) throw new BadRequestException('Google no devolvió una reseña nueva, reciente y de 4 o 5 estrellas que todavía no esté cargada. Intentá nuevamente más adelante.');
    const selected = eligible[Math.floor(Math.random() * eligible.length)];

    return this.prisma.$transaction(async (transaction) => {
      const db = transaction as any;
      const current = await db.googleReview.findUnique({ where: { id: currentId } });
      if (!current?.active) throw new BadRequestException('Solo podés reemplazar una reseña visible.');
      await db.googleReview.update({ where: { id: currentId }, data: { active: false } });
      return db.googleReview.create({ data: { author: selected.author, rating: selected.rating, text: selected.text, reviewDate: selected.reviewDate, active: true, sortOrder: current.sortOrder, source: 'GOOGLE', googleReviewId: selected.externalId, authorUri: selected.authorUri, authorPhotoUrl: selected.authorPhotoUrl, googleMapsUri: selected.googleMapsUri } });
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
