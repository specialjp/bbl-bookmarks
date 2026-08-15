import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { setupTestAuth, TestAuth } from './utils/test-auth';
import {
  disconnectTestPrisma,
  getTestPrisma,
  truncateAll,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Collections (e2e)', () => {
  let app: INestApplication;
  let auth: TestAuth;
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;

  const server = (): ReturnType<INestApplication['getHttpServer']> =>
    app.getHttpServer();

  beforeAll(async () => {
    auth = setupTestAuth();
    app = await createTestApp();
    tokenA = auth.signToken({ sub: 'auth0|user-a' });
    tokenB = auth.signToken({ sub: 'auth0|user-b' });
  });

  beforeEach(async () => {
    await truncateAll();
    // Fixed ids: UsersService caches sub -> userId in-process (ADR-006).
    // Rows are recreated between tests; keeping ids stable keeps the cache
    // valid. (In production users are never deleted, so no staleness exists.)
    const prisma = getTestPrisma();
    const a = await prisma.user.create({
      data: { id: 'test-user-a', sub: 'auth0|user-a', email: 'a@example.com' },
    });
    const b = await prisma.user.create({
      data: { id: 'test-user-b', sub: 'auth0|user-b', email: 'b@example.com' },
    });
    userAId = a.id;
    userBId = b.id;
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
    auth.cleanup();
  });

  const createCollection = async (
    token: string,
    name: string,
  ): Promise<{ id: string }> => {
    const res = await request(server())
      .post('/api/collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    return res.body as { id: string };
  };

  describe('CRUD happy paths', () => {
    it('POST -> 201 with isOwner, GET one -> 200, list -> paginated', async () => {
      const { id } = await createCollection(tokenA, 'Engineering');

      const one = await request(server())
        .get(`/api/collections/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(one.body as Record<string, unknown>).toMatchObject({
        id,
        name: 'Engineering',
        ownerId: userAId,
        isOwner: true,
      });

      const list = await request(server())
        .get('/api/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      const body = list.body as {
        data: unknown[];
        meta: Record<string, number>;
      };
      expect(body.data).toHaveLength(1);
      expect(body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('PUT replaces, PATCH partially updates', async () => {
      const { id } = await createCollection(tokenA, 'Old Name');

      const put = await request(server())
        .put(`/api/collections/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Replaced' })
        .expect(200);
      expect((put.body as { name: string }).name).toBe('Replaced');

      const patch = await request(server())
        .patch(`/api/collections/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Patched' })
        .expect(200);
      expect((patch.body as { name: string }).name).toBe('Patched');
    });

    it('DELETE -> 204 and the collection is gone', async () => {
      const { id } = await createCollection(tokenA, 'Doomed');
      await request(server())
        .delete(`/api/collections/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(204);
      await request(server())
        .get(`/api/collections/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('?name= filters case-insensitively', async () => {
      await createCollection(tokenA, 'Engineering');
      await createCollection(tokenA, 'Recipes');
      const res = await request(server())
        .get('/api/collections?name=engineer')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      const body = res.body as { data: { name: string }[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Engineering');
    });
  });

  describe('privacy invariant — spec §3: user B must not even learn user A exists', () => {
    it("list endpoints never contain the other user's rows", async () => {
      await createCollection(tokenA, 'A private');
      await createCollection(tokenB, 'B private');
      const res = await request(server())
        .get('/api/collections')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      const body = res.body as { data: { name: string }[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('B private');
    });

    it("cross-user GET/PUT/PATCH/DELETE -> 404 with a body INDISTINGUISHABLE from a nonexistent id's 404", async () => {
      const { id } = await createCollection(tokenA, 'A only');

      const foreign404s = await Promise.all([
        request(server())
          .get(`/api/collections/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .expect(404),
        request(server())
          .put(`/api/collections/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ name: 'stolen' })
          .expect(404),
        request(server())
          .patch(`/api/collections/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ name: 'stolen' })
          .expect(404),
        request(server())
          .delete(`/api/collections/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .expect(404),
      ]);

      const ghost = await request(server())
        .get('/api/collections/clzzzzzzzzzzzzzzzzzzzzzzz')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      for (const res of foreign404s) {
        expect(res.body).toEqual(ghost.body); // no existence leak (ADR-007)
      }

      // and nothing actually changed
      const intact = await request(server())
        .get(`/api/collections/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((intact.body as { name: string }).name).toBe('A only');
    });

    it("nested GET /collections/:id/bookmarks -> 404 for another user's collection", async () => {
      const { id } = await createCollection(tokenA, 'A only');
      await getTestPrisma().bookmark.create({
        data: {
          url: 'https://example.com',
          title: 'secret',
          ownerId: userAId,
          collectionId: id,
        },
      });
      await request(server())
        .get(`/api/collections/${id}/bookmarks`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
      // owner sees them
      const own = await request(server())
        .get(`/api/collections/${id}/bookmarks`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((own.body as { data: unknown[] }).data).toHaveLength(1);
    });
  });

  describe('validation (400s)', () => {
    it('unknown body field -> 400 (forbidNonWhitelisted; ownerId cannot be injected)', () =>
      request(server())
        .post('/api/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'x', ownerId: userBId })
        .expect(400));

    it('empty name -> 400', () =>
      request(server())
        .post('/api/collections')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: '' })
        .expect(400));

    it('limit above 100 -> 400', () =>
      request(server())
        .get('/api/collections?limit=500')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400));
  });
});
