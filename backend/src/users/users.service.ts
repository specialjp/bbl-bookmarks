import { Injectable } from '@nestjs/common';

import { AuthUser } from '../auth/auth-user.interface';
import { UserinfoClient } from '../auth/userinfo.client';
import { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  // sub -> AuthUser. /userinfo is aggressively rate-limited (~5/min/user),
  // so it is hit at most once per unknown sub per process (ADR-006).
  private readonly cache = new Map<string, AuthUser>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly userinfo: UserinfoClient,
  ) {}

  async resolveFromToken(sub: string, accessToken: string): Promise<AuthUser> {
    const cached = this.cache.get(sub);
    if (cached) return cached;

    const existing = await this.prisma.user.findUnique({ where: { sub } });
    if (existing) return this.remember(existing);

    // Unknown sub: resolve profile, then upsert KEYED BY EMAIL so a seeded
    // placeholder row is relinked to the real Auth0 sub on first login —
    // same row id, every FK stays valid (ADR-006).
    const profile = await this.userinfo.fetchUserinfo(accessToken);
    const user = await this.prisma.user.upsert({
      where: { email: profile.email },
      update: { sub: profile.sub, name: profile.name ?? undefined },
      create: {
        sub: profile.sub,
        email: profile.email,
        name: profile.name ?? null,
      },
    });
    return this.remember(user);
  }

  findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  private remember(user: User): AuthUser {
    const authUser: AuthUser = {
      userId: user.id,
      sub: user.sub,
      email: user.email,
    };
    this.cache.set(user.sub, authUser);
    return authUser;
  }
}
