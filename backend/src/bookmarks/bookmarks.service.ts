import { Injectable, NotFoundException } from '@nestjs/common';

import {
  Paginated,
  paginated,
} from '../common/interfaces/paginated.interface';
import { Bookmark, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

// Privacy invariant (spec §3): every query carries ownerId from the verified
// JWT. Bookmarks are never shared individually — only via their collection's
// read paths (ADR-009) — so ALL routes here are owner-only.
@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: QueryBookmarksDto,
  ): Promise<Paginated<Bookmark>> {
    const where: Prisma.BookmarkWhereInput = {
      ownerId: userId,
      ...(query.collectionId ? { collectionId: query.collectionId } : {}),
      ...(query.uncategorised ? { collectionId: null } : {}),
    };
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

  async getOne(userId: string, id: string): Promise<Bookmark> {
    const row = await this.prisma.bookmark.findFirst({
      where: { id, ownerId: userId },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(userId: string, dto: CreateBookmarkDto): Promise<Bookmark> {
    await this.assertOwnedCollection(userId, dto.collectionId);
    return this.prisma.bookmark.create({
      data: {
        url: dto.url,
        title: dto.title,
        notes: dto.notes ?? null,
        collectionId: dto.collectionId ?? null,
        ownerId: userId,
      },
    });
  }

  /** PUT — full replace: omitted optionals become null (ADR-003). */
  async replace(
    userId: string,
    id: string,
    dto: CreateBookmarkDto,
  ): Promise<Bookmark> {
    await this.assertOwnedCollection(userId, dto.collectionId);
    return this.ownedUpdate(userId, id, {
      url: dto.url,
      title: dto.title,
      notes: dto.notes ?? null,
      collectionId: dto.collectionId ?? null,
    });
  }

  /** PATCH — partial: only provided fields change; explicit nulls clear. */
  async patch(
    userId: string,
    id: string,
    dto: UpdateBookmarkDto,
  ): Promise<Bookmark> {
    if (dto.collectionId !== undefined && dto.collectionId !== null) {
      await this.assertOwnedCollection(userId, dto.collectionId);
    }
    const data: Prisma.BookmarkUncheckedUpdateInput = {};
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.collectionId !== undefined) data.collectionId = dto.collectionId;
    return this.ownedUpdate(userId, id, data);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.bookmark.deleteMany({
      where: { id, ownerId: userId },
    });
    if (result.count === 0) throw new NotFoundException();
  }

  // A supplied collectionId must resolve to a collection the caller OWNS —
  // foreign and shared-read-only collections 404 identically (ADR-007/009).
  private async assertOwnedCollection(
    userId: string,
    collectionId: string | null | undefined,
  ): Promise<void> {
    if (!collectionId) return;
    const owned = await this.prisma.collection.findFirst({
      where: { id: collectionId, ownerId: userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException();
  }

  private async ownedUpdate(
    userId: string,
    id: string,
    data: Prisma.BookmarkUncheckedUpdateInput,
  ): Promise<Bookmark> {
    const result = await this.prisma.bookmark.updateMany({
      where: { id, ownerId: userId },
      data,
    });
    if (result.count === 0) throw new NotFoundException();
    return this.prisma.bookmark.findUniqueOrThrow({ where: { id } });
  }
}
