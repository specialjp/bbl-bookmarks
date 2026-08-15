import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { setupTestAuth, TestAuth } from './utils/test-auth';
import {
  disconnectTestPrisma,
  getTestPrisma,
  truncateAll,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Collection sharing (e2e, ADR-009)', () => {
  let app: INestApplication;
  let auth: TestAuth;
  let tokenA: string; // owner
  let tokenB: string; // grantee
  let tokenC: string; // third party
  const userAId = 'test-user-a';
  const userBId = 'test-user-b';
  const userCId = 'test-user-c';

  const server = (): ReturnType<INestApplication['getHttpServer']> =>
    app.getHttpServer();

  beforeAll(async () => {
    auth = setupTestAuth();
    app = await createTestApp();
    tokenA = auth.signToken({ sub: 'auth0|user-a' });
    tokenB = auth.signToken({ sub: 'auth0|user-b' });
    tokenC = auth.signToken({ sub: 'auth0|user-c' });
  });

  beforeEach(async () => {
    await truncateAll();
    const prisma = getTestPrisma();
    for (const [id, sub, email] of [
      [userAId, 'auth0|user-a', 'a@example.com'],
      [userBId, 'auth0|user-b', 'b@example.com'],
      [userCId, 'auth0|user-c', 'c@example.com'],
    ] as const) {
      await prisma.user.create({ data: { id, sub, email } });
    }
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
    auth.cleanup();
  });

  interface Minted {
    id: string;
    token: string;
    collectionId: string;
  }

  const setupSharedCollection = async (): Promise<{
    collectionId: string;
    share: Minted;
  }> => {
    const prisma = getTestPrisma();
    const col = await prisma.collection.create({
      data: { name: 'Shared stuff', ownerId: userAId },
    });
    await prisma.bookmark.create({
      data: {
        url: 'https://shared.example.com',
        title: 'shared bookmark',
        ownerId: userAId,
        collectionId: col.id,
      },
    });
    const res = await request(server())
      .post(`/api/collections/${col.id}/shares`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    return { collectionId: col.id, share: res.body as Minted };
  };

  it('mint returns the token exactly once; GET /shares never echoes it', async () => {
    const { share } = await setupSharedCollection();
    expect(share.token).toHaveLength(43); // 32 bytes base64url
    const list = await request(server())
      .get('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const rows = (list.body as { data: Record<string, unknown>[] }).data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('token');
  });

  it("non-owner cannot mint for someone else's collection -> 404", async () => {
    const { collectionId } = await setupSharedCollection();
    await request(server())
      .post(`/api/collections/${collectionId}/shares`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('accept flow: grantee gains READ access to collection + its bookmarks, and sees it under shared-with-me', async () => {
    const { collectionId, share } = await setupSharedCollection();

    // before accept: invisible (spec §3)
    await request(server())
      .get(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: share.token })
      .expect(200);

    const col = await request(server())
      .get(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect((col.body as { isOwner: boolean }).isOwner).toBe(false);

    const bookmarks = await request(server())
      .get(`/api/collections/${collectionId}/bookmarks`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect((bookmarks.body as { data: unknown[] }).data).toHaveLength(1);

    const shared = await request(server())
      .get('/api/collections/shared-with-me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect((shared.body as { data: { id: string }[] }).data).toEqual([
      expect.objectContaining({ id: collectionId, isOwner: false }),
    ]);
  });

  it('read-only is structural: grantee writes -> 404 exactly like a stranger', async () => {
    const { collectionId, share } = await setupSharedCollection();
    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: share.token })
      .expect(200);

    await request(server())
      .put(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'hijacked' })
      .expect(404);
    await request(server())
      .patch(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'hijacked' })
      .expect(404);
    await request(server())
      .delete(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    // cannot add bookmarks INTO a shared collection either
    await request(server())
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        url: 'https://sneak.example.com',
        title: 'sneak',
        collectionId,
      })
      .expect(404);
  });

  it('revoke cuts access immediately; re-revoke is idempotent', async () => {
    const { collectionId, share } = await setupSharedCollection();
    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: share.token })
      .expect(200);

    await request(server())
      .delete(`/api/shares/${share.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);

    await request(server())
      .get(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    await request(server())
      .delete(`/api/shares/${share.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
  });

  it('token edge cases: unknown -> 404, revoked -> 404 (indistinguishable), own -> 400, claimed-by-other -> 409, re-accept -> 200', async () => {
    const { share } = await setupSharedCollection();

    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: 'nope-nope-nope' })
      .expect(404);

    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ token: share.token })
      .expect(400);

    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: share.token })
      .expect(200);
    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: share.token })
      .expect(200); // idempotent
    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ token: share.token })
      .expect(409); // single-use invite

    // revoked token accepts like it never existed
    await request(server())
      .delete(`/api/shares/${share.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
    await request(server())
      .post('/api/shares/accept')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ token: share.token })
      .expect(404);
  });

  it("revoke by non-issuer -> 404 (can't even learn the share exists)", async () => {
    const { share } = await setupSharedCollection();
    await request(server())
      .delete(`/api/shares/${share.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });
});
