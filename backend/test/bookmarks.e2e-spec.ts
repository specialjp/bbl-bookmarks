import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { setupTestAuth, TestAuth } from './utils/test-auth';
import {
  disconnectTestPrisma,
  getTestPrisma,
  truncateAll,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Bookmarks (e2e)', () => {
  let app: INestApplication;
  let auth: TestAuth;
  let tokenA: string;
  let tokenB: string;
  const userAId = 'test-user-a';
  const userBId = 'test-user-b';

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
    const prisma = getTestPrisma();
    await prisma.user.create({
      data: { id: userAId, sub: 'auth0|user-a', email: 'a@example.com' },
    });
    await prisma.user.create({
      data: { id: userBId, sub: 'auth0|user-b', email: 'b@example.com' },
    });
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
    auth.cleanup();
  });

  const mkCollection = (ownerId: string, name: string): Promise<{ id: string }> =>
    getTestPrisma().collection.create({ data: { name, ownerId } });

  const createBookmark = async (
    token: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> => {
    const res = await request(server())
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    return res.body as { id: string };
  };

  describe('CRUD + PUT/PATCH semantics', () => {
    it('POST -> 201; GET one -> 200', async () => {
      const { id } = await createBookmark(tokenA, {
        url: 'https://example.com/article',
        title: 'An article',
        notes: 'read later',
      });
      const res = await request(server())
        .get(`/api/bookmarks/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(res.body as Record<string, unknown>).toMatchObject({
        id,
        url: 'https://example.com/article',
        title: 'An article',
        notes: 'read later',
        collectionId: null,
        ownerId: userAId,
      });
    });

    it('POST url without protocol -> 400', () =>
      request(server())
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ url: 'example.com', title: 'no protocol' })
        .expect(400));

    it('PUT is a FULL replace — omitted notes/collectionId become null (ADR-003)', async () => {
      const col = await mkCollection(userAId, 'Col');
      const { id } = await createBookmark(tokenA, {
        url: 'https://example.com',
        title: 'Before',
        notes: 'keep?',
        collectionId: col.id,
      });
      const res = await request(server())
        .put(`/api/bookmarks/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ url: 'https://example.com/v2', title: 'After' })
        .expect(200);
      expect(res.body as Record<string, unknown>).toMatchObject({
        title: 'After',
        notes: null,
        collectionId: null,
      });
    });

    it('PATCH only touches provided fields; collectionId:null uncategorises', async () => {
      const col = await mkCollection(userAId, 'Col');
      const { id } = await createBookmark(tokenA, {
        url: 'https://example.com',
        title: 'Title',
        notes: 'notes stay',
        collectionId: col.id,
      });
      const res = await request(server())
        .patch(`/api/bookmarks/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ collectionId: null })
        .expect(200);
      expect(res.body as Record<string, unknown>).toMatchObject({
        title: 'Title',
        notes: 'notes stay',
        collectionId: null,
      });
    });

    it('DELETE -> 204', async () => {
      const { id } = await createBookmark(tokenA, {
        url: 'https://example.com',
        title: 'bye',
      });
      await request(server())
        .delete(`/api/bookmarks/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(204);
      await request(server())
        .get(`/api/bookmarks/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });
  });

  describe('filters', () => {
    it('?collectionId= and ?uncategorised=true partition the list', async () => {
      const col = await mkCollection(userAId, 'Col');
      await createBookmark(tokenA, {
        url: 'https://one.example.com',
        title: 'in collection',
        collectionId: col.id,
      });
      await createBookmark(tokenA, {
        url: 'https://two.example.com',
        title: 'loose',
      });

      const inCol = await request(server())
        .get(`/api/bookmarks?collectionId=${col.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((inCol.body as { data: { title: string }[] }).data).toEqual([
        expect.objectContaining({ title: 'in collection' }),
      ]);

      const loose = await request(server())
        .get('/api/bookmarks?uncategorised=true')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((loose.body as { data: { title: string }[] }).data).toEqual([
        expect.objectContaining({ title: 'loose' }),
      ]);
    });
  });

  describe('on-delete SetNull (ADR-008)', () => {
    it('deleting a collection keeps its bookmarks as uncategorised', async () => {
      const col = await mkCollection(userAId, 'Doomed');
      const { id } = await createBookmark(tokenA, {
        url: 'https://survivor.example.com',
        title: 'survivor',
        collectionId: col.id,
      });

      await request(server())
        .delete(`/api/collections/${col.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(204);

      const res = await request(server())
        .get(`/api/bookmarks/${id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((res.body as { collectionId: string | null }).collectionId).toBeNull();

      const loose = await request(server())
        .get('/api/bookmarks?uncategorised=true')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect((loose.body as { data: unknown[] }).data).toHaveLength(1);
    });
  });

  describe('privacy invariant — spec §3', () => {
    it("B's list never contains A's bookmarks", async () => {
      await createBookmark(tokenA, {
        url: 'https://a-secret.example.com',
        title: 'A secret',
      });
      const res = await request(server())
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect((res.body as { data: unknown[] }).data).toHaveLength(0);
    });

    it("cross-user GET/PUT/PATCH/DELETE -> 404, body identical to nonexistent id", async () => {
      const { id } = await createBookmark(tokenA, {
        url: 'https://a.example.com',
        title: 'A only',
      });
      const foreign = await Promise.all([
        request(server())
          .get(`/api/bookmarks/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .expect(404),
        request(server())
          .put(`/api/bookmarks/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ url: 'https://steal.example.com', title: 'stolen' })
          .expect(404),
        request(server())
          .patch(`/api/bookmarks/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ title: 'stolen' })
          .expect(404),
        request(server())
          .delete(`/api/bookmarks/${id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .expect(404),
      ]);
      const ghost = await request(server())
        .get('/api/bookmarks/clzzzzzzzzzzzzzzzzzzzzzzz')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
      for (const res of foreign) expect(res.body).toEqual(ghost.body);
    });

    it("POST with another user's collectionId -> 404 (cannot attach into foreign collections)", async () => {
      const colB = await mkCollection(userBId, 'B col');
      await request(server())
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          url: 'https://a.example.com',
          title: 'sneaky',
          collectionId: colB.id,
        })
        .expect(404);
    });

    it('unknown body field (ownerId injection) -> 400', () =>
      request(server())
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          url: 'https://a.example.com',
          title: 'x',
          ownerId: userBId,
        })
        .expect(400));
  });
});
