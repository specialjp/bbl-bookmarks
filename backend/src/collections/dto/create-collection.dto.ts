import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Note: no ownerId here — ownership always comes from the verified JWT.
export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
