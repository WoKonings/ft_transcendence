import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  readonly gameId: string;
}
