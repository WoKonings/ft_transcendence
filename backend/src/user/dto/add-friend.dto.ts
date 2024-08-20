import { IsNotEmpty, IsNumber } from 'class-validator';

export class AddFriendDto {
	@IsNumber()
	@IsNotEmpty()
	targetId: number;

	@IsNumber()
	@IsNotEmpty()
	userId: number;
}