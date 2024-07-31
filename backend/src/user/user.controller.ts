import { Controller, Delete, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() userData: Prisma.UserCreateInput) {
    try {
      return await this.userService.createUser(userData);
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
  
  @Get('search/:username')
  async getUserByUsernameOrEmail(@Param('username') username: string) {
    return this.userService.getUserByUsernameOrEmail(String(username));
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(Number(id));
  }

}
