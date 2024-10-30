import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class JoinGameDto {
  @IsNotEmpty()
  @IsBoolean()
  readonly isPrivate: boolean;

  @IsNotEmpty()
  @IsBoolean()
  readonly bigPong: boolean;
}
