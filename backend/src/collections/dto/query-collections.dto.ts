import { IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryCollectionsDto extends PaginationDto {
  /** case-insensitive contains filter */
  @IsOptional()
  @IsString()
  name?: string;
}
