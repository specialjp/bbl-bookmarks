import { PartialType } from '@nestjs/mapped-types';

import { CreateBookmarkDto } from './create-bookmark.dto';

// PATCH body (ADR-003): any subset; `collectionId: null` uncategorises,
// `notes: null` clears. PUT reuses CreateBookmarkDto (full representation;
// omitted optionals become null).
export class UpdateBookmarkDto extends PartialType(CreateBookmarkDto) {}
