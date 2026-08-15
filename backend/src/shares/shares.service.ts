import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { PaginationDto } from '../common/dto/pagination.dto';
import { Paginated, paginated } from '../common/interfaces/paginated.interface';
import { CollectionShare } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ShareView = Omit<CollectionShare, 'token'>;

export interface MintedShare extends ShareView {
  token: string;
}

// ADR-009: sharing is signed-in-only, read-only, single-use invite.
// The token is returned exactly once, at mint (ADR-014: stored raw —
// documented hardening gap). Read access is enforced structurally in
// CollectionsService.readableWhere; nothing here grants writes.
@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  async mint(userId: string, collectionId: string): Promise<MintedShare> {
    // Owner-only; foreign/nonexistent collections 404 identically (spec §3).
    const owned = await this.prisma.collection.findFirst({
      where: { id: collectionId, ownerId: userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException();

    const share = await this.prisma.collectionShare.create({
      data: {
        collectionId,
        token: randomBytes(32).toString('base64url'),
      },
    });
    // The ONLY response that ever carries the token.
    return share;
  }

  async listIssued(
    userId: string,
    query: PaginationDto,
  ): Promise<Paginated<ShareView>> {
    const where = { collection: { ownerId: userId } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionShare.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        omit: { token: true },
      }),
      this.prisma.collectionShare.count({ where }),
    ]);
    return paginated(rows, total, query.page, query.limit);
  }

  /** Soft revoke — access is cut immediately; re-revoke is an idempotent no-op. */
  async revoke(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.collectionShare.findFirst({
      where: { id: shareId, collection: { ownerId: userId } },
      select: { id: true, revokedAt: true },
    });
    if (!share) throw new NotFoundException();
    if (!share.revokedAt) {
      await this.prisma.collectionShare.update({
        where: { id: shareId },
        data: { revokedAt: new Date() },
      });
    }
  }

  async accept(userId: string, token: string): Promise<ShareView> {
    const share = await this.prisma.collectionShare.findUnique({
      where: { token },
      include: { collection: { select: { ownerId: true } } },
    });
    // Unknown and revoked tokens are indistinguishable (spec §3).
    if (!share || share.revokedAt) throw new NotFoundException();
    if (share.collection.ownerId === userId) {
      throw new BadRequestException('You already own this collection');
    }
    if (share.granteeUserId === userId) {
      return this.stripToken(share); // idempotent re-accept
    }
    if (share.granteeUserId !== null) {
      throw new ConflictException('This invite has already been claimed');
    }

    try {
      const bound = await this.prisma.collectionShare.update({
        where: { id: share.id },
        data: { granteeUserId: userId },
      });
      return this.stripToken(bound);
    } catch (e) {
      // P2002 on @@unique([collectionId, granteeUserId]): the caller already
      // holds another accepted invite for this collection — same outcome.
      if ((e as { code?: string }).code === 'P2002') {
        return this.stripToken(share);
      }
      throw e;
    }
  }

  private stripToken(
    share: CollectionShare & Record<string, unknown>,
  ): ShareView {
    const {
      token: _token,
      collection: _c,
      ...view
    } = share as CollectionShare & {
      collection?: unknown;
    };
    return view;
  }
}
