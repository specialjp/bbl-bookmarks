import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { setupTestAuth, TestAuth } from './utils/test-auth';
import {
  disconnectTestPrisma,
  getTestPrisma,
  truncateAll,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Full-text search ?q= (e2e, ADR-011)', () => {
  let app: INestApplication;
  let auth: TestAuth;
  let tokenA: string;
  const userAId = 'test-user-a';
  const userBId = 'test-user-b';

  const server = (): ReturnType<INestApplication['getHttpServer']> =>
    app.getHttpServer();

  const search = (token: string, qs: string): request.Test =>
    request(server())
      .get(`/api/bookmarks?${qs}`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    auth = setupTestAuth();
    app = await createTestApp();
    tokenA = auth.signToken({ sub: 'auth0|user-a' });
  });

  beforeEach(async () => {
    await truncateAll();
    const prisma = getTestPrisma();
    await prisma.user.create({
      data: { id: userAId, sub: 'auth0|user-a', email: 'a@example.com' },
    });
    await prisma.user.create({
      data: { id: userBId, sub: 'auth0|user-b', email: 'b@example.com' },
    });
    await prisma.bookmark.createMany({
      data: [
        {
          ownerId: userAId,
          url: 'https://pg.example.com',
          title: 'PostgreSQL full text search deep dive',
          notes: 'tsvector and GIN indexes',
        },
        {
          ownerId: userAId,
          url: 'https://ts.example.com',
          title: 'TypeScript strict mode',
          notes: 'null checks everywhere',
        },
        {
          ownerId: userAId,
          url: 'https://notes-only.example.com',
          title: 'Weekly reading',
          notes: 'covers postgresql performance tuning',
        },
        {
          // EXACT same searchable phrase, but owned by user B — must never
          // surface for A. Pins the ownerId predicate inside the raw SQL.
          ownerId: userBId,
          url: 'https://b.example.com',
          title: 'PostgreSQL full text search deep dive',
          notes: 'user B private copy',
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
    auth.cleanup();
  });

  it('matches in title AND in notes', async () => {
    const res = await search(tokenA, 'q=postgresql').expect(200);
    const body = res.body as {
      data: { url: string }[];
      meta: { total: number };
    };
    expect(body.meta.total).toBe(2);
    expect(body.data.map((b) => b.url).sort()).toEqual([
      'https://notes-only.example.com',
      'https://pg.example.com',
    ]);
  });

  it("NEVER returns another user's rows even on an exact phrase match (spec §3 in raw SQL)", async () => {
    const res = await search(tokenA, 'q=postgresql full text search').expect(
      200,
    );
    const body = res.body as { data: { ownerId: string; url: string }[] };
    expect(body.data.length).toBeGreaterThan(0);
    for (const row of body.data) {
      expect(row.ownerId).toBe(userAId);
      expect(row.url).not.toBe('https://b.example.com');
    }
  });

  it('no match -> empty page with total 0', async () => {
    const res = await search(tokenA, 'q=zebra quantum').expect(200);
    const body = res.body as { data: unknown[]; meta: { total: number } };
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });

  it('hostile input (quotes, operators) is handled, not a 500', async () => {
    await search(
      tokenA,
      `q=${encodeURIComponent(`"unbalanced ' quote -!`)}`,
    ).expect(200);
  });

  it('combines with ?collectionId=', async () => {
    const prisma = getTestPrisma();
    const col = await prisma.collection.create({
      data: { name: 'PG stuff', ownerId: userAId },
    });
    await prisma.bookmark.create({
      data: {
        ownerId: userAId,
        collectionId: col.id,
        url: 'https://in-col.example.com',
        title: 'postgresql inside a collection',
      },
    });
    const res = await search(
      tokenA,
      `q=postgresql&collectionId=${col.id}`,
    ).expect(200);
    const body = res.body as { data: { url: string }[] };
    expect(body.data).toEqual([
      expect.objectContaining({ url: 'https://in-col.example.com' }),
    ]);
  });
});
