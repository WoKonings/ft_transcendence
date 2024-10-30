import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class InviteGameDto {
  @IsNotEmpty()
  @IsString()
  readonly targetName: string;
}
