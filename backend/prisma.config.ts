import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: ['.env', '../.env'] });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // `generate` does not connect to MySQL, so a local placeholder keeps installs
  // deterministic; migrations still use DATABASE_URL when it is configured.
  datasource: { url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/tu_casa_ideal' },
});
