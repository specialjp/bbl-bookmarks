import { Injectable, NotFoundException } from '@nestjs/common';

import { PaginationDto } from '../common/dto/pagination.dto';
import { Paginated, paginated } from '../common/interfaces/paginated.interface';
import { Bookmark, Collection, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { QueryCollectionsDto } from './dto/query-collections.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

export type CollectionView = Collection & { isOwner: boolean };

// Privacy invariant: reads are owner-or-active-grantee; writes are owner-only.
// A write on a merely-shared (or foreign, or nonexistent) collection finds no
// row -> 404. Read-only sharing is structural, not a role check (ADR-007/009).
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readableWhere(
    userId: string,
    id?: string,
  ): Prisma.CollectionWhereInput {
    return {
      ...(id ? { id } : {}),
      OR: [
        { ownerId: userId },
        { shares: { some: { granteeUserId: userId, revokedAt: null } } },
      ],
    };
  }

  async list(
    userId: string,
    query: QueryCollectionsDto,
  ): Promise<Paginated<CollectionView>> {
    const where: Prisma.CollectionWhereInput = {
      ownerId: userId,
      ...(query.name
        ? { name: { contains: query.name, mode: 'insensitive' } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.collection.count({ where }),
    ]);
    return paginated(
      rows.map((c) => ({ ...c, isOwner: true })),
      total,
      query.page,
      query.limit,
    );
  }

  async listSharedWithMe(
    userId: string,
    query: QueryCollectionsDto,
  ): Promise<Paginated<CollectionView>> {
    const where: Prisma.CollectionWhereInput = {
      shares: { some: { granteeUserId: userId, revokedAt: null } },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.collection.count({ where }),
    ]);
    return paginated(
      rows.map((c) => ({ ...c, isOwner: false })),
      total,
      query.page,
      query.limit,
    );
  }

  async getOne(userId: string, id: string): Promise<CollectionView> {
    const row = await this.prisma.collection.findFirst({
      where: this.readableWhere(userId, id),
    });
    if (!row) throw new NotFoundException();
    return { ...row, isOwner: row.ownerId === userId };
  }

  async create(
    userId: string,
    dto: CreateCollectionDto,
  ): Promise<CollectionView> {
    const row = await this.prisma.collection.create({
      data: { name: dto.name, ownerId: userId },
    });
    return { ...row, isOwner: true };
  }

  /** PUT — full replace. Same shape as create for this resource. */
  async replace(
    userId: string,
    id: string,
    dto: CreateCollectionDto,
  ): Promise<CollectionView> {
    return this.ownedUpdate(userId, id, { name: dto.name });
  }

  /** PATCH — partial. */
  async patch(
    userId: string,
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<CollectionView> {
    return this.ownedUpdate(userId, id, dto);
  }

  async remove(userId: string, id: string): Promise<void> {
    // Owner-only scoped delete; bookmarks survive via SetNull (ADR-008).
    const result = await this.prisma.collection.deleteMany({
      where: { id, ownerId: userId },
    });
    if (result.count === 0) throw new NotFoundException();
  }

  async listBookmarks(
    userId: string,
    id: string,
    query: PaginationDto,
  ): Promise<Paginated<Bookmark>> {
    // Readable check first: owner or active grantee, else indistinguishable 404.
    const collection = await this.prisma.collection.findFirst({
      where: this.readableWhere(userId, id),
      select: { id: true },
    });
    if (!collection) throw new NotFoundException();

    const where: Prisma.BookmarkWhereInput = { collectionId: id };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bookmark.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.bookmark.count({ where }),
    ]);
    return paginated(rows, total, query.page, query.limit);
  }

  private async ownedUpdate(
    userId: string,
    id: string,
    data: Prisma.CollectionUpdateInput,
  ): Promise<CollectionView> {
    const result = await this.prisma.collection.updateMany({
      where: { id, ownerId: userId },
      data,
    });
    if (result.count === 0) throw new NotFoundException();
    const row = await this.prisma.collection.findUniqueOrThrow({
      where: { id },
    });
    return { ...row, isOwner: true };
  }
}
