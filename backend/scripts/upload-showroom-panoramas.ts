import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

async function main() {
  const source = resolve(process.argv[2] || '');
  const targetFolder = (process.argv[3] || 'showroom-360').replace(/^\/+|\/+$/g, '');
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) throw new Error('Faltan variables de Cloudflare R2.');
  if (!/^[a-z0-9][a-z0-9/_-]*$/i.test(targetFolder)) throw new Error('La carpeta de destino de R2 no es vÃ¡lida.');

  const client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
  const names = (await readdir(source)).filter((name) => /\.(jpe?g|png|webp|avif)$/i.test(name)).sort();
  const urls: string[] = [];
  for (const name of names) {
    const input = await readFile(resolve(source, name));
    const image = sharp(input, { failOn: 'error' }).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || Math.abs(metadata.width / metadata.height - 2) > 0.12) throw new Error(`${name} no tiene proporción panorámica 2:1.`);
    const body = await image.resize({ width: 6144, height: 3072, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toBuffer();
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
    const cleanName = basename(name, extname(name)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const key = `${targetFolder}/${cleanName}-${hash}.webp`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
    urls.push(`${publicUrl}/${key}`);
  }
  process.stdout.write(`${JSON.stringify(urls, null, 2)}\n`);
}

void main();
