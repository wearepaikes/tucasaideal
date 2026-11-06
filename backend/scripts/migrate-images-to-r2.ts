import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')] });

const assetsOnly = process.argv.includes('--assets-only');
const housesOnly = process.argv.includes('--houses-only');
const required = [
  ...(!assetsOnly ? ['DATABASE_URL'] as const : []),
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;
for (const name of required) if (!process.env[name]) throw new Error(`Falta ${name} en .env`);

const bucket = process.env.R2_BUCKET_NAME!;
const publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, '');
const client = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
const imageRoot = resolve(process.cwd(), '../img');

function createPrisma() {
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter: new PrismaMariaDb({ host: databaseUrl.hostname, port: Number(databaseUrl.port || 3306), user: decodeURIComponent(databaseUrl.username), password: decodeURIComponent(databaseUrl.password), database: databaseUrl.pathname.slice(1), connectionLimit: 2 }) });
}

const prisma = assetsOnly ? undefined : createPrisma();

function localImage(folder: string, value: string) {
  const safeName = basename(value);
  const candidates = extname(safeName) ? [safeName] : ['.jpg', '.jpeg', '.png', '.webp', '.avif'].map((extension) => `${safeName}${extension}`);
  const path = candidates.map((candidate) => resolve(imageRoot, folder, candidate)).find(existsSync);
  if (!path) throw new Error(`No se encontró la imagen local ${folder}/${value}`);
  return path;
}

async function upload(path: string, key: string) {
  const body = await sharp(path, { failOn: 'error' }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
  return `${publicUrl}/${key}`;
}

function legacyKeyFromValue(folder: 'projects' | 'houses', value: string) {
  const cleanName = basename(value, extname(value)).replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `${folder}/legacy/${cleanName}.webp`;
}

async function existingR2Url(key: string) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return `${publicUrl}/${key}`;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string }).name === 'NotFound') return undefined;
    throw error;
  }
}

function legacyKey(folder: 'projects' | 'houses', path: string) {
  return legacyKeyFromValue(folder, path);
}

async function uploadStaticAssets() {
  const sources = [
    { source: resolve(imageRoot, 'proyectos'), target: 'projects' as const },
    { source: resolve(imageRoot, 'obras'), target: 'houses' as const },
  ].filter(({ target }) => !housesOnly || target === 'houses');
  let uploaded = 0;
  for (const { source, target } of sources) {
    const entries = await readdir(source, { withFileTypes: true });
    const names = entries
      .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    for (let index = 0; index < names.length; index += 6) {
      const batch = names.slice(index, index + 6);
      const urls = await Promise.all(batch.map(async (name) => {
        const path = resolve(source, name);
        return upload(path, legacyKey(target, path));
      }));
      uploaded += urls.length;
      for (const url of urls) console.log(`R2: ${url}`);
    }
  }
  console.log(`Carga multimedia terminada: ${uploaded} imágenes subidas a R2.`);
}

async function removeUploaded(urls: string[]) {
  await Promise.all(urls.map((url) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: decodeURIComponent(url.slice(publicUrl.length + 1)) }))));
}

async function migrateProjects() {
  if (!prisma) throw new Error('La conexión a la base de datos no está disponible.');
  const projects = await prisma.project.findMany({ orderBy: { id: 'asc' } });
  let migrated = 0;
  for (const project of projects) {
    const oldPhotos = Array.isArray(project.photos) ? project.photos.filter((photo): photo is string => typeof photo === 'string') : [];
    const uploaded: string[] = [];
    try {
      const photos: string[] = [];
      for (let index = 0; index < oldPhotos.length; index += 1) {
        const photo = oldPhotos[index];
        if (/^https?:\/\//.test(photo)) { photos.push(photo); continue; }
        const key = legacyKeyFromValue('projects', photo);
        let url = await existingR2Url(key);
        if (!url) {
          const path = localImage('proyectos', photo);
          url = await upload(path, key);
          uploaded.push(url);
        }
        photos.push(url);
      }
      const coverIndex = oldPhotos.indexOf(project.cover);
      const cover = coverIndex >= 0 ? photos[coverIndex] : photos[0];
      if (!cover) throw new Error(`El proyecto ${project.name} no tiene imágenes`);
      await prisma.project.update({ where: { id: project.id }, data: { photos, cover } });
      migrated += uploaded.length;
      console.log(`Proyecto: ${project.name} (${uploaded.length} imágenes migradas)`);
    } catch (error) {
      await removeUploaded(uploaded).catch(() => undefined);
      throw error;
    }
  }
  return migrated;
}

async function migrateWorks() {
  if (!prisma) throw new Error('La conexión a la base de datos no está disponible.');
  const works = await prisma.work.findMany({ orderBy: { id: 'asc' } });
  let migrated = 0;
  for (const work of works) {
    if (/^https?:\/\//.test(work.photo)) continue;
    const key = legacyKeyFromValue('houses', work.photo);
    let url = await existingR2Url(key);
    const uploaded: string[] = [];
    if (!url) {
      const path = localImage('obras', work.photo);
      url = await upload(path, key);
      uploaded.push(url);
    }
    try {
      await prisma.work.update({ where: { id: work.id }, data: { photo: url, photos: [url] } });
      migrated += 1;
      console.log(`Casa: ${work.name || work.location} (1 imagen migrada)`);
    } catch (error) {
      await removeUploaded(uploaded).catch(() => undefined);
      throw error;
    }
  }
  return migrated;
}

async function main() {
  if (assetsOnly) {
    await uploadStaticAssets();
    return;
  }
  if (housesOnly) {
    const houseImages = await migrateWorks();
    console.log(`MigraciÃ³n terminada: ${houseImages} imÃ¡genes de casas.`);
    return;
  }
  const projectImages = await migrateProjects();
  const houseImages = await migrateWorks();
  console.log(`Migración terminada: ${projectImages} imágenes de proyectos y ${houseImages} imágenes de casas.`);
}

main().finally(() => prisma?.$disconnect());
