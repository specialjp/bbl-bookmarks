import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptShareDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
