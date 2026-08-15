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

  /** full-text search over title + notes, relevance-ranked (ADR-011) */
  @IsOptional()
  @IsString()
  q?: string;
}
