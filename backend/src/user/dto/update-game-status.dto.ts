import { IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateGameStatusDto {
	@IsNumber()
	@IsNotEmpty()
	userId: number;

	@IsBoolean()
	@IsNotEmpty()
	isInGame: boolean;
}