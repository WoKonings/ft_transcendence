import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class GameState {
  ball: { x: number, y: number, dx: number, dy: number, radius: number };
  paddles: { [key: string]: { x: number, y: number, width: number, height: number, dy: number } };
  scores: { [key: string]: number };
  players: { [key: number]: boolean};
  player1: Boolean;
  player2: Boolean;
  private userService: UserService;

  constructor() {
    this.ball = { x: 401, y: 301, dx: 4, dy: 4, radius: 10 };
    this.paddles = {};
    this.players = {};
    this.scores = {};
  }

  setUserService(userService: UserService) {
    this.userService = userService;
  }

  async addPlayer(id: string) {
    try {
      const user = await this.userService.getUserById(Number(id));
      if (user.isInGame == true || this.players[id] == 1)
      {
        // console.log('Prevented double adding player!');
        return;
      }
      if (user) {
        console.log("Added player", user.username);
      }
      this.userService.setIsInGame(user.id, true);
      this.players[id] = 1;
      this.paddles[id] = { x: 30, y: 250, width: 10, height: 100, dy: 0 };
      this.scores[id] = 0;
    } catch (error) {
      console.error('Error adding player:', error);
    }
  }

  async removePlayer(id: string) {
    try {
      const user = await this.userService.getUserById(Number(id));
    this.userService.setIsInGame(user.id, false);
    this.players[id] = 0;
    delete this.paddles[id];
    delete this.scores[id];
    } catch (error) {
      console.error('Error removing player:', error);
    }
  }

  updatePlayerPosition(id: string, y: number) {
    if (this.paddles[id]) {
      this.paddles[id].y = y;
    }
  }

  update() {
    try {
      // Move ball
      this.ball.x += this.ball.dx;
      this.ball.y += this.ball.dy;
      // console.log(`Ball position: (${this.ball.x}, ${this.ball.y})`); // Add more detailed logging if needed
  
      // Ball collision with top and bottom
      if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > 600) {
        this.ball.dy *= -1;
      }
  
      // Ball collision with paddles
      for (const id in this.paddles) {
        const paddle = this.paddles[id];
        if (this.ball.x - this.ball.radius < paddle.x + paddle.width && this.ball.x + this.ball.radius > paddle.x &&
          this.ball.y > paddle.y && this.ball.y < paddle.y + paddle.height) {
          this.ball.dx *= -1.1;
          if (this.ball.dx > 10)
            this.ball.dx = 10;
          if (this.ball.dx < -10)
            this.ball.dx = -10;
        }
      }
  
      // Check for scoring
      if (this.ball.x - this.ball.radius < 0) {
        // Player 2 scores
        this.resetBall();
      } else if (this.ball.x + this.ball.radius > 800) {
        // Player 1 scores
        this.ball.dx *= -1;
        // this.resetBall(); //disabled because we don't have a player 2 yet.
      }
    } catch (error) {
      console.error('Error during update:', error);
    }
  }

  resetBall() {
    this.ball.x = 400;
    this.ball.y = 300;
    if (this.ball.dx > 0)
      this.ball.dx = -4; 
    if (this.ball.dx < 0)
      this.ball.dx = 4; 
      
    // this.ball.dx *= -1; // Change ball direction
  }
}
