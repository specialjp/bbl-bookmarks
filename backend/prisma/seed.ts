import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

// Idempotent seed for two distinct users (assignment requirement).
//
// The Auth0<->seed linkage trap (ADR-006): the real test user's `sub` is
// unknowable until first login, so User 1 gets a PLACEHOLDER sub keyed to the
// assignment's test-account email. On first real login, UsersService's
// email-keyed upsert swaps in the live sub — same row id, so everything
// seeded below instantly belongs to the live session.
//
// User 2 never logs in: their data existing-but-invisible is what the
// privacy e2e suite (and any manual reviewer poking) verifies against.

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  }),
});

async function main(): Promise<void> {
  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@test.com' },
    update: {},
    create: {
      id: 'seed-user-candidate',
      sub: 'auth0|seed-candidate-placeholder',
      email: 'candidate@test.com',
      name: 'Candidate (seeded)',
    },
  });

  const other = await prisma.user.upsert({
    where: { email: 'other@test.com' },
    update: {},
    create: {
      id: 'seed-user-other',
      sub: 'auth0|seed-other',
      email: 'other@test.com',
      name: 'Other User (seeded)',
    },
  });

  // --- Candidate's collections & bookmarks (searchable phrases on purpose) —
  const collections: Record<string, string> = {};
  for (const [id, name, ownerId] of [
    ['seed-col-eng', 'Engineering', candidate.id],
    ['seed-col-reading', 'Reading List', candidate.id],
    ['seed-col-recipes', 'Recipes', candidate.id],
    ['seed-col-other-work', 'Work Notes', other.id],
    ['seed-col-other-travel', 'Travel Plans', other.id],
  ] as const) {
    const col = await prisma.collection.upsert({
      where: { id },
      update: {},
      create: { id, name, ownerId },
    });
    collections[id] = col.id;
  }

  const bookmarks: Array<{
    id: string;
    ownerId: string;
    collectionId: string | null;
    url: string;
    title: string;
    notes?: string;
  }> = [
    // candidate — Engineering
    {
      id: 'seed-bm-1',
      ownerId: candidate.id,
      collectionId: collections['seed-col-eng'],
      url: 'https://www.postgresql.org/docs/current/textsearch.html',
      title: 'PostgreSQL full text search deep dive',
      notes: 'tsvector, GIN indexes, websearch_to_tsquery examples',
    },
    {
      id: 'seed-bm-2',
      ownerId: candidate.id,
      collectionId: collections['seed-col-eng'],
      url: 'https://www.typescriptlang.org/tsconfig#strict',
      title: 'TypeScript strict mode notes',
      notes: 'strictNullChecks pitfalls and migration strategy',
    },
    {
      id: 'seed-bm-3',
      ownerId: candidate.id,
      collectionId: collections['seed-col-eng'],
      url: 'https://docs.nestjs.com/security/authentication',
      title: 'NestJS authentication guide',
      notes: 'passport strategies and global guards',
    },
    // candidate — Reading List
    {
      id: 'seed-bm-4',
      ownerId: candidate.id,
      collectionId: collections['seed-col-reading'],
      url: 'https://auth0.com/docs/secure/tokens/access-tokens',
      title: 'Access tokens vs ID tokens',
      notes: 'why APIs must validate audience-bound access tokens',
    },
    {
      id: 'seed-bm-5',
      ownerId: candidate.id,
      collectionId: collections['seed-col-reading'],
      url: 'https://react.dev/learn',
      title: 'Modern React patterns',
      notes: 'server vs client thinking, effects discipline',
    },
    // candidate — Recipes
    {
      id: 'seed-bm-6',
      ownerId: candidate.id,
      collectionId: collections['seed-col-recipes'],
      url: 'https://example-kitchen.com/pad-krapow',
      title: 'Pad krapow recipe',
      notes: 'holy basil, high heat, crispy fried egg',
    },
    // candidate — uncategorised
    {
      id: 'seed-bm-7',
      ownerId: candidate.id,
      collectionId: null,
      url: 'https://12factor.net/',
      title: 'The Twelve-Factor App',
      notes: 'config in the environment',
    },
    {
      id: 'seed-bm-8',
      ownerId: candidate.id,
      collectionId: null,
      url: 'https://www.prisma.io/docs/orm',
      title: 'Prisma ORM docs',
      notes: 'driver adapters are mandatory in v7',
    },
    // other user — private, must NEVER appear for the candidate
    {
      id: 'seed-bm-o1',
      ownerId: other.id,
      collectionId: collections['seed-col-other-work'],
      url: 'https://other.example.com/quarterly',
      title: 'Quarterly planning doc',
      notes: 'private to other@test.com',
    },
    {
      id: 'seed-bm-o2',
      ownerId: other.id,
      collectionId: collections['seed-col-other-work'],
      url: 'https://other.example.com/postgres',
      title: 'PostgreSQL full text search deep dive',
      notes: "other user's copy — exact same phrase, must not leak in search",
    },
    {
      id: 'seed-bm-o3',
      ownerId: other.id,
      collectionId: collections['seed-col-other-travel'],
      url: 'https://other.example.com/osaka',
      title: 'Osaka itinerary',
      notes: 'flights and food list',
    },
    {
      id: 'seed-bm-o4',
      ownerId: other.id,
      collectionId: null,
      url: 'https://other.example.com/loose',
      title: 'Uncategorised private link',
    },
  ];

  for (const bm of bookmarks) {
    await prisma.bookmark.upsert({
      where: { id: bm.id },
      update: {},
      create: bm,
    });
  }

  // Pre-accepted share: other's "Travel Plans" -> candidate (read-only), so
  // "Shared with me" is populated on the very first login.
  await prisma.collectionShare.upsert({
    where: { id: 'seed-share-1' },
    update: {},
    create: {
      id: 'seed-share-1',
      collectionId: collections['seed-col-other-travel'],
      token: 'seed-token-already-claimed-not-reusable',
      granteeUserId: candidate.id,
    },
  });

  console.log('Seed complete: 2 users, 5 collections, 12 bookmarks, 1 accepted share.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
