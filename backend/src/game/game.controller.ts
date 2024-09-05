import { Controller, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  // Endpoint to fetch all games
  @Get()
  async getAllGames() {
    return this.gameService.getAllGames();
  }

  // Endpoint to fetch games of a specific user
  @Get('/:userId')
  async getUserGames(@Param('userId') userId: string) {
    const id = Number(userId);
    return this.gameService.getUserGames(id);
  }
}