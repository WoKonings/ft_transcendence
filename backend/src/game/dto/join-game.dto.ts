import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class JoinGameDto {
  @IsNotEmpty()
  @IsString()
  readonly userId: string;

  @IsNotEmpty()
  @IsString()
  readonly username: string;

  @IsNotEmpty()
  @IsBoolean()
  readonly isPrivate: boolean;

  @IsNotEmpty()
  @IsBoolean()
  readonly bigPong: boolean;
}
