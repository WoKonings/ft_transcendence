import { Injectable } from '@nestjs/common';
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

  async getUserById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
