import { execSync } from 'node:child_process';
import { Client } from 'pg';

const TEST_DB = 'bookmarks_test';
const ADMIN_URL =
  process.env.TEST_ADMIN_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://postgres:postgres@localhost:5432/${TEST_DB}?schema=public`;

export default async function globalSetup(): Promise<void> {
  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${TEST_DB}`);
  } catch (e) {
    if ((e as { code?: string }).code !== '42P04') throw e; // 42P04 = already exists
  } finally {
    await client.end();
  }
  execSync('./node_modules/.bin/prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: 'inherit',
  });
}
