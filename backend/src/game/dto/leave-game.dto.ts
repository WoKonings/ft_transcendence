import { IsNotEmpty, IsString } from "class-validator";

export class LeaveGameDto {
	@IsNotEmpty()
	@IsString()
	readonly userId: string;
  
	@IsNotEmpty()
	@IsString()
	readonly username: string;
  }