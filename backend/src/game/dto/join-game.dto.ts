import { IsNotEmpty, IsString, } from 'class-validator';

export class JoinGameDto {
  @IsNotEmpty()
  @IsString()
  readonly userId: string;

  @IsNotEmpty()
  @IsString()
  readonly username: string;
}