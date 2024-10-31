import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 15)
  username: string;

  @IsString()
  @IsNotEmpty()
  // @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(0, 50)
  password: string;
}
