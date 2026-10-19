import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export type UploadedImage = { buffer: Buffer; originalname: string; mimetype: string; size: number };

@Injectable()
export class R2StorageService {
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly client?: S3Client;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET_NAME') || '';
    this.publicUrl = (config.get<string>('R2_PUBLIC_URL') || '').replace(/\/$/, '');
    if (accountId && accessKeyId && secretAccessKey && this.bucket && this.publicUrl) {
      this.client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
    }
  }

  private configured() {
    if (!this.client) throw new ServiceUnavailableException('Cloudflare R2 todavía no está configurado. Completá las variables R2 del backend.');
    return this.client;
  }

  private async uploadImages(files: UploadedImage[], folder: 'projects' | 'houses') {
    const client = this.configured();
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        let body: Buffer;
        try {
          body = await sharp(file.buffer, { failOn: 'error' }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
        } catch {
          throw new BadRequestException(`No pudimos procesar la imagen ${file.originalname}.`);
        }
        const key = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}.webp`;
        await client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
        uploaded.push(`${this.publicUrl}/${key}`);
      }
      return uploaded;
    } catch (error) {
      await this.deleteImages(uploaded, folder).catch(() => undefined);
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('No pudimos guardar las imágenes en Cloudflare R2. Intentá nuevamente.');
    }
  }


  uploadProjectImages(files: UploadedImage[]) { return this.uploadImages(files, 'projects'); }
  uploadHouseImages(files: UploadedImage[]) { return this.uploadImages(files, 'houses'); }

  private async deleteImages(urls: string[], folder: 'projects' | 'houses') {
    if (!this.client || !this.publicUrl) return;
    await Promise.all(urls.filter((url) => url.startsWith(`${this.publicUrl}/${folder}/`)).map((url) => {
      const key = decodeURIComponent(url.slice(this.publicUrl.length + 1));
      return this.client!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }));
  }


  deleteProjectImages(urls: string[]) { return this.deleteImages(urls, 'projects'); }
  deleteHouseImages(urls: string[]) { return this.deleteImages(urls, 'houses'); }
}
