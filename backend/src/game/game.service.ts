import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  // fetch all games
  async getAllGames() {
    return this.prisma.game.findMany({
      include: {
        players: {
          select: {
            id: true,
            username: true,
            elo: true,
          }
        },
        winner: {
          select: {
            id: true,
            username: true,
            elo: true,
          }
        },
      },
    });
  }

  // fetch one specific user's games
  async getUserGames(userId: number) {
    return this.prisma.game.findMany({
      where: {
        players: {
          some: { id: userId },
        },
      },
      include: {
        players: {
          select: {
            id: true,
            username: true,
            elo: true,
          },
        },
        winner: {
          select: {
            id: true,
            username: true,
            elo: true,
          },
        },
      },
    });
  }
}
