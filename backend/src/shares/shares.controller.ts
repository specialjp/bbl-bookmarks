import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Paginated } from '../common/interfaces/paginated.interface';
import { AcceptShareDto } from './dto/accept-share.dto';
import { MintedShare, SharesService, ShareView } from './shares.service';

@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  /** Mint an invite for an owned collection — token shown only here. */
  @Post('collections/:id/shares')
  mint(
    @CurrentUser() user: AuthUser,
    @Param('id') collectionId: string,
  ): Promise<MintedShare> {
    return this.shares.mint(user.userId, collectionId);
  }

  @Get('shares')
  listIssued(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<ShareView>> {
    return this.shares.listIssued(user.userId, query);
  }

  // Declared before shares/:id so 'accept' is not captured as an id.
  @Post('shares/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptShareDto,
  ): Promise<ShareView> {
    return this.shares.accept(user.userId, dto.token);
  }

  @Delete('shares/:id')
  @HttpCode(204)
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.shares.revoke(user.userId, id);
  }
}
