import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')] });

const required = ['DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'] as const;
for (const name of required) if (!process.env[name]) throw new Error(`Falta ${name} en .env`);

const databaseUrl = new URL(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: databaseUrl.hostname, port: Number(databaseUrl.port || 3306), user: decodeURIComponent(databaseUrl.username), password: decodeURIComponent(databaseUrl.password), database: databaseUrl.pathname.slice(1), connectionLimit: 2 }) });
const bucket = process.env.R2_BUCKET_NAME!;
const publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, '');
const client = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
const imageRoot = resolve(process.cwd(), '../img');

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

async function removeUploaded(urls: string[]) {
  await Promise.all(urls.map((url) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: decodeURIComponent(url.slice(publicUrl.length + 1)) }))));
}

async function migrateProjects() {
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
        const url = await upload(localImage('proyectos', photo), `projects/legacy/${project.slug}/${String(index + 1).padStart(2, '0')}.webp`);
        uploaded.push(url); photos.push(url);
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
  const works = await prisma.work.findMany({ orderBy: { id: 'asc' } });
  let migrated = 0;
  for (const work of works) {
    if (/^https?:\/\//.test(work.photo)) continue;
    const keyName = basename(work.photo, extname(work.photo)).replace(/[^a-zA-Z0-9_-]+/g, '-');
    const url = await upload(localImage('obras', work.photo), `houses/legacy/${work.id}-${keyName}.webp`);
    try {
      await prisma.work.update({ where: { id: work.id }, data: { photo: url } });
      migrated += 1;
      console.log(`Casa: ${work.name || work.location} (1 imagen migrada)`);
    } catch (error) {
      await removeUploaded([url]).catch(() => undefined);
      throw error;
    }
  }
  return migrated;
}

async function main() {
  const projectImages = await migrateProjects();
  const houseImages = await migrateWorks();
  console.log(`Migración terminada: ${projectImages} imágenes de proyectos y ${houseImages} imágenes de casas.`);
}

main().finally(() => prisma.$disconnect());
