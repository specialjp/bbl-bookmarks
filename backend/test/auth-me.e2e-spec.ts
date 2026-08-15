import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { setupTestAuth, TestAuth } from './utils/test-auth';
import {
  disconnectTestPrisma,
  getTestPrisma,
  truncateAll,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Auth guard + /me provisioning (e2e)', () => {
  let app: INestApplication;
  let auth: TestAuth;

  beforeAll(async () => {
    auth = setupTestAuth();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
    auth.cleanup();
  });

  describe('401 matrix — every invalid token shape is rejected', () => {
    it('no token -> 401', () =>
      request(app.getHttpServer()).get('/api/me').expect(401));

    it('garbage token -> 401', () =>
      request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401));

    it('expired token -> 401', async () => {
      const token = auth.signToken({
        sub: 'auth0|expired',
        exp: Math.floor(Date.now() / 1000) - 60,
      });
      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('wrong audience -> 401', async () => {
      const token = auth.signToken({
        sub: 'auth0|wrong-aud',
        aud: 'https://some-other-api',
      });
      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('wrong issuer (missing trailing slash — ADR-013) -> 401', async () => {
      const token = auth.signToken({
        sub: 'auth0|wrong-iss',
        iss: 'https://dev-yg.us.auth0.com', // no trailing slash
      });
      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('provisioning (ADR-006)', () => {
    it('unknown sub -> /userinfo hit once, user created, /me returns it', async () => {
      auth.userinfoProfiles.set('auth0|new-user', {
        email: 'new@example.com',
        name: 'New User',
      });
      const token = auth.signToken({ sub: 'auth0|new-user' });
      const before = auth.userinfoCalls();

      const res = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body as Record<string, unknown>).toMatchObject({
        sub: 'auth0|new-user',
        email: 'new@example.com',
        name: 'New User',
      });
      expect(auth.userinfoCalls()).toBe(before + 1);

      // second request: served from cache/DB — no extra /userinfo call
      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(auth.userinfoCalls()).toBe(before + 1);
    });

    it('seeded placeholder user is relinked by email on first login — same row id, data retained', async () => {
      const prisma = getTestPrisma();
      const seeded = await prisma.user.create({
        data: {
          sub: 'auth0|seed-candidate',
          email: 'candidate@test.com',
          name: 'Seeded Candidate',
          collections: { create: { name: 'Seeded Collection' } },
        },
      });

      auth.userinfoProfiles.set('auth0|real-live-sub', {
        email: 'candidate@test.com',
        name: 'Real Candidate',
      });
      const token = auth.signToken({ sub: 'auth0|real-live-sub' });

      const res = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Same row: id preserved, sub replaced — seeded data now owned by the live session.
      const body = res.body as { id: string; sub: string };
      expect(body.id).toBe(seeded.id);
      expect(body.sub).toBe('auth0|real-live-sub');
      const collections = await prisma.collection.findMany({
        where: { ownerId: seeded.id },
      });
      expect(collections).toHaveLength(1);
    });
  });
});
