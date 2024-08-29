import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class InviteGameDto {
  @IsNotEmpty()
  @IsString()
  readonly senderName: string;

  @IsNotEmpty()
  @IsString()
  readonly senderId: string;

  @IsNotEmpty()
  @IsString()
  readonly targetName: string;
}
