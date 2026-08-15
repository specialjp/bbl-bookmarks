import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Paginated } from '../common/interfaces/paginated.interface';
import { Bookmark } from '../generated/prisma/client';
import { CollectionsService, CollectionView } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { QueryCollectionsDto } from './dto/query-collections.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCollectionsDto,
  ): Promise<Paginated<CollectionView>> {
    return this.collections.list(user.userId, query);
  }

  // Declared before :id so the literal segment is not shadowed.
  @Get('shared-with-me')
  sharedWithMe(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCollectionsDto,
  ): Promise<Paginated<CollectionView>> {
    return this.collections.listSharedWithMe(user.userId, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCollectionDto,
  ): Promise<CollectionView> {
    return this.collections.create(user.userId, dto);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<CollectionView> {
    return this.collections.getOne(user.userId, id);
  }

  @Put(':id')
  replace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCollectionDto,
  ): Promise<CollectionView> {
    return this.collections.replace(user.userId, id, dto);
  }

  @Patch(':id')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<CollectionView> {
    return this.collections.patch(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.collections.remove(user.userId, id);
  }

  @Get(':id/bookmarks')
  listBookmarks(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<Paginated<Bookmark>> {
    return this.collections.listBookmarks(user.userId, id, query);
  }
}
