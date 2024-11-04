import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.user.updateMany({
      data: {
        isOnline: false,
        isInQueue: false,
        isInGame: false,
      },
    });
  }
  getHello(): string {
    return 'test test!';
  }
}
