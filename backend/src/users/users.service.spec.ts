import { UserinfoClient } from '../auth/userinfo.client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

// Branch logic only — the full flow is covered by auth-me e2e. These pin the
// caching contract (userinfo hit at most once per sub) at the unit level.
describe('UsersService.resolveFromToken', () => {
  const row = {
    id: 'u1',
    sub: 'auth0|abc',
    email: 'a@example.com',
    name: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const makeService = (overrides?: {
    findUnique?: jest.Mock;
    upsert?: jest.Mock;
    fetchUserinfo?: jest.Mock;
  }): {
    service: UsersService;
    findUnique: jest.Mock;
    upsert: jest.Mock;
    fetchUserinfo: jest.Mock;
  } => {
    const findUnique = overrides?.findUnique ?? jest.fn();
    const upsert = overrides?.upsert ?? jest.fn();
    const fetchUserinfo = overrides?.fetchUserinfo ?? jest.fn();
    const prisma = { user: { findUnique, upsert } } as unknown as PrismaService;
    const userinfo = { fetchUserinfo } as unknown as UserinfoClient;
    return {
      service: new UsersService(prisma, userinfo),
      findUnique,
      upsert,
      fetchUserinfo,
    };
  };

  it('DB hit: no /userinfo call, result cached for the next call', async () => {
    const { service, findUnique, fetchUserinfo } = makeService({
      findUnique: jest.fn().mockResolvedValue(row),
    });

    const first = await service.resolveFromToken('auth0|abc', 'tok');
    expect(first).toEqual({
      userId: 'u1',
      sub: 'auth0|abc',
      email: 'a@example.com',
    });
    expect(fetchUserinfo).not.toHaveBeenCalled();

    await service.resolveFromToken('auth0|abc', 'tok');
    expect(findUnique).toHaveBeenCalledTimes(1); // second call served from cache
  });

  it('unknown sub: /userinfo once, upsert KEYED BY EMAIL (relink mechanism)', async () => {
    const { service, upsert, fetchUserinfo } = makeService({
      findUnique: jest.fn().mockResolvedValue(null),
      fetchUserinfo: jest.fn().mockResolvedValue({
        sub: 'auth0|real',
        email: 'candidate@test.com',
        name: 'Real',
      }),
      upsert: jest.fn().mockResolvedValue({
        ...row,
        sub: 'auth0|real',
        email: 'candidate@test.com',
      }),
    });

    await service.resolveFromToken('auth0|real', 'tok');

    expect(fetchUserinfo).toHaveBeenCalledWith('tok');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const upsertArgs = upsert.mock.calls[0][0] as {
      where: { email: string };
      update: { sub: string };
    };
    expect(upsertArgs.where).toEqual({ email: 'candidate@test.com' });
    expect(upsertArgs.update.sub).toBe('auth0|real');
  });
});
