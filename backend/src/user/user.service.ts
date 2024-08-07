import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, User } from '@prisma/client';

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

  async getUserSafely(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
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
      throw new NotFoundException('User with ID ${id} not found.');
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
