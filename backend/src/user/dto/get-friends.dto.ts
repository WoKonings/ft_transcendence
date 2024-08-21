import { IsInt, IsNotEmpty } from 'class-validator';

export class GetFriendsDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;
}