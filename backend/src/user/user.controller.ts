import { Controller, UseGuards, Delete, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { AddFriendDto } from './dto/add-friend.dto';

@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post()
	async createUser(@Body() createUserDto: CreateUserDto) {
		try {
			return await this.userService.createUser(createUserDto);
		} catch (error) {
			if (error.message.includes('Unique constraint violation')) {
				throw new HttpException({
					status: HttpStatus.CONFLICT,
					error: error.message,
				}, HttpStatus.CONFLICT);
			}
			throw new HttpException({
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				error: 'Internal Server Error',
			}, HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@UseGuards(AuthGuard)
	@Post('add')
	async addUserAsFriend(@Body() addFriendDto: AddFriendDto) {
		return this.userService.addUserAsFriend(addFriendDto.targetId, addFriendDto.userId);
	}

	@Get('all')
	async getAllUsers() {
		return this.userService.getAllUsers();
	}

	@Get('search/:username')
	async getUserByUsernameOrEmail(@Param('username') username: string) {
		return this.userService.getUserByUsernameOrEmail(username);
	}

	@Get(':id')
	async getUserById(@Param('id') id: string) {
		return this.userService.getUserById(Number(id));
	}

	@UseGuards(AuthGuard)
	@Delete(':id')
	async deleteUser(@Param('id') id: string) {
		return this.userService.deleteUser(Number(id));
	}
}