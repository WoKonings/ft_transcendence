import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '../auth/auth.guard'

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
  @UseGuards(AuthGuard)
  async getUserGames(@Param('userId') userId: string) {
    const id = Number(userId);
    console.log (`test: ${this.gameService.getUserGames(id)}`);
    return this.gameService.getUserGames(id);
  }
}