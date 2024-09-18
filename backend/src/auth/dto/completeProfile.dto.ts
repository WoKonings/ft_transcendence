import { IsString, IsNotEmpty } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  access_token: string;
}