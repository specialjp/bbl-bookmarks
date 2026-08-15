import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryBookmarksDto extends PaginationDto {
  @IsOptional()
  @IsString()
  collectionId?: string;

  /** ?uncategorised=true — only bookmarks with collectionId IS NULL */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  uncategorised?: boolean;

  // ?q= (FTS, ADR-011) lands with the search commit — adding the field
  // earlier would accept-and-ignore an undocumented param (contract drift).
}
