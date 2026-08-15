import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// No ownerId — ownership always comes from the verified JWT (spec §3).
export class CreateBookmarkDto {
  @IsUrl({ require_protocol: true })
  url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  // Must resolve to an OWNED collection, else 404 — shared collections are
  // read-only, so attaching to them is not possible (ADR-009).
  @IsOptional()
  @IsString()
  collectionId?: string | null;
}
