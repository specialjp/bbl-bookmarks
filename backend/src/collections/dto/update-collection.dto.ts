import { PartialType } from '@nestjs/mapped-types';

import { CreateCollectionDto } from './create-collection.dto';

// PATCH body (ADR-003). PUT reuses CreateCollectionDto: full representation.
export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
