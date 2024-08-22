import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

//todo: re-enable later.
export class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	// @Length(3, 20)
	username: string;

	@IsString()
	@IsNotEmpty()
	// @IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	// @Length(8, 50)
	password: string;
}
