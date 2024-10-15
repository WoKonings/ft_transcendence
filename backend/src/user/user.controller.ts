import { Controller, UseGuards, Delete, Get, Post, Body, Param, HttpException, HttpStatus, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { AddFriendDto } from './dto/add-friend.dto';
import { GetFriendsDto } from './dto/get-friends.dto';

// file storage
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { promises as fs } from 'fs';
import { imageSize } from 'image-size';


@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	// @Post()
	// async createUser(@Body() createUserDto: CreateUserDto) {
	// 	try {
	// 		return await this.userService.createUser(createUserDto);
	// 	} catch (error) {
	// 		if (error.message.includes('Unique constraint violation')) {
	// 			throw new HttpException({
	// 				status: HttpStatus.CONFLICT,
	// 				error: error.message,
	// 			}, HttpStatus.CONFLICT);
	// 		}
	// 		throw new HttpException({
	// 			status: HttpStatus.INTERNAL_SERVER_ERROR,
	// 			error: 'Internal Server Error',
	// 		}, HttpStatus.INTERNAL_SERVER_ERROR);
	// 	}
	// }

	@UseGuards(AuthGuard)
	@Post('add')
	async addUserAsFriend(@Body() addFriendDto: AddFriendDto) {
		return this.userService.addUserAsFriend(addFriendDto.targetId, addFriendDto.userId);
	}

	@UseGuards(AuthGuard)
	@Post('remove')
	async removeFriend(@Body() addFriendDto: AddFriendDto) {
		return this.userService.removeFriend(addFriendDto.targetId, addFriendDto.userId);
	}

	@Get('all')
	async getAllUsers() {
		return this.userService.getAllUsers();
	}

  @Post('friends')
  async getFriends(@Body() getFriendsDto: GetFriendsDto) {
    const { userId } = getFriendsDto;
    return this.userService.getFriends(userId);
  }

  @Post('pending')
  async getIncomingPendingFriends(@Body() getFriendsDto: GetFriendsDto) {
    const { userId } = getFriendsDto;
    return this.userService.getIncomingPendingFriends(userId);
  }


	@Get('search/:username')
	async getUserByUsername(@Param('username') username: string) {
		return this.userService.getUserByUsername(username);
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

	@UseGuards(AuthGuard)
	@Post('update-username')
	async updateUsername(@Body('newUsername') newUsername: string, @Req() req: Request) {
    const userPayload = req['user'];
    
    console.log(`updating username for ID: ${userPayload.sub} N: ${userPayload.username} req: ${newUsername}`);
    if (!newUsername || newUsername.trim() === '') {
      throw new BadRequestException('Username cannot be empty');
    }
    if (newUsername.length > 15) {
      throw new BadRequestException('Username cannot be longer than 15 characters');
    } 
    if (newUsername.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }

    console.log (`updating user specs: id: ${userPayload.sub}, newName: ${newUsername}`);
		return this.userService.updateUsername(userPayload.sub, newUsername);
	}

  @UseGuards(AuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      const fileExtension = extname(file.originalname).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.gif'].includes(fileExtension)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const userPayload = req['user'];

    console.log('wtf: ', userPayload);

    // Validate image dimensions
    const dimensions = imageSize(file.path);
    if (dimensions.width < 40 || dimensions.height < 40 || dimensions.width > 2048 || dimensions.height > 2048) {
        await fs.unlink(file.path); // Delete the invalid file
        throw new Error('Image dimensions must be between 40x40 and 2048x2048 pixels.');
    }

    // Fetch the current user to check for an existing avatar
    const user = await this.userService.getUserById(userPayload.id);

    // If the user already has an avatar, delete the old file from the server
    if (user.avatar) {
      const oldAvatarPath = `./uploads/avatars/${user.avatar.split('/').pop()}`;
      try {
        await fs.unlink(oldAvatarPath);
        console.log(`Deleted old avatar: ${oldAvatarPath}`);
      } catch (error) {
        console.error(`Error deleting old avatar: ${error.message}`);
      }
    }

    console.log(`CHANGING AVATAR FOR ${user.id} / ${user.username}`);
    await this.userService.updateAvatar(user.id, file.filename);
    return { message: 'Avatar uploaded successfully' };
  }
}