import { BadRequestException, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, User, Channel } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Unique constraint violation, a user with this email or username already exists');
        }
      }
      throw error;
    }
  }

  async addUserAsFriend(targetId: number, userId: number) {
	  console.log('targetId:', targetId, 'userId:', userId); // Log IDs to verify they are correct
	// Fetch the target user
    if (!targetId || !userId) {
      throw new Error('Invalid user IDs provided');
    }
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }

    // Check if userId is already in the pending list
    if (targetUser.pending.includes(userId)) {
      // throw new BadRequestException('Friend request already sent');
      return { message: 'Friend request already sent'};
    }

    // Update the target user's pending list
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        pending: {
          push: userId,
        },
      },
    });

    return { message: 'Friend request sent' };
  }

  async getUserForAuth(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
  }

  //todo: delete the email part?
  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
      id: true,
      username: true,
      },
	});
  
	return users;
  }

  //todo: error catching if no user?
  async getUserById(userId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getIsInGame(userId: number): Promise<Boolean> {
    const user = await this.getUserById(userId); // Use await to get the actual user object
    if (!user) {
      throw new Error('User not found');
    }
    return user.isInGame;
  }
  
  async setIsInGame(userId: number, bool: boolean): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isInGame: bool },
    });
  
    console.log(`${user.username} is ingame?: ${user.isInGame}`);
  }

  async deleteUser(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
