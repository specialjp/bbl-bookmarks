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
import { Paginated } from '../common/interfaces/paginated.interface';
import { Bookmark } from '../generated/prisma/client';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryBookmarksDto,
  ): Promise<Paginated<Bookmark>> {
    return this.bookmarks.list(user.userId, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookmarkDto,
  ): Promise<Bookmark> {
    return this.bookmarks.create(user.userId, dto);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<Bookmark> {
    return this.bookmarks.getOne(user.userId, id);
  }

  @Put(':id')
  replace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateBookmarkDto,
  ): Promise<Bookmark> {
    return this.bookmarks.replace(user.userId, id, dto);
  }

  @Patch(':id')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookmarkDto,
  ): Promise<Bookmark> {
    return this.bookmarks.patch(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.bookmarks.remove(user.userId, id);
  }
}
