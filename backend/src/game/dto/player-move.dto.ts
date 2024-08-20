import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class PlayerMoveDto {
	@IsNotEmpty()
	@IsString()
	readonly userId: string;
  
	@IsNotEmpty()
	@IsNumber()
	readonly y: number;
  }