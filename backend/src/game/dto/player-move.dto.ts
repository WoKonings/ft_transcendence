import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class PlayerMoveDto {  
	@IsNotEmpty()
	@IsNumber()
	readonly dy: number;
}