import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class GameState {
  ball: { x: number, y: number, dx: number, dy: number, radius: number };
  paddle1: { x: number, y: number, width: number, height: number, dy: number };
  paddle2: { x: number, y: number, width: number, height: number, dy: number };
  score: { playerOne: number, playerTwo: number };
  playerOne: string | null;
  playerTwo: string | null;
  bounceCooldown: number;
  lastUpdateTime: number;


	constructor() {
		this.resetBall();
		this.paddle1 = { x: -14, y: 0, width: 1, height: 4, dy: 0 };
		this.paddle2 = { x: 14, y: 0, width: 1, height: 4, dy: 0 };
		this.score = { playerOne: 0, playerTwo: 0 };
		this.playerOne = null;
		this.playerTwo = null;
		this.bounceCooldown = 0;
		this.lastUpdateTime = Date.now();
	}

	updatePlayerPosition(userId: string, y: number) {
		if (userId == this.playerOne) {
			if (y < -13) y = -13;
			if (y > 13) y = 13;
			this.paddle1.y = y;
		} else if (userId == this.playerTwo) {
			if (y < -13) y = -13;
			if (y > 13) y = 13;
			this.paddle2.y = y;
		}
	}

	update() {
		const currentTime = Date.now();
		const deltaTime = currentTime - this.lastUpdateTime;
		this.lastUpdateTime = currentTime;

		// Update ball position
		this.ball.x += this.ball.dx;
		this.ball.y += this.ball.dy;

		// Update cooldown timer
		if (this.bounceCooldown > 0) {
			this.bounceCooldown -= deltaTime;
		}

		// Ball collision with top and bottom screen boundaries
		if (this.bounceCooldown <= 0 && (this.ball.y - this.ball.radius < -16 || this.ball.y + this.ball.radius > 16)) {
			this.ball.dy *= -1;
			this.bounceCooldown = 150;
		}

    // Ball collision with paddles
    if (
      this.ball.dx < 0 &&
      this.ball.x - this.ball.radius <= this.paddle1.x + this.paddle1.width &&
      this.ball.x > this.paddle1.x &&
      this.ball.y > this.paddle1.y - 2 &&
      this.ball.y < this.paddle1.y + this.paddle1.height + 2 &&
      this.bounceCooldown <= 0
    ) {
      this.ball.dx *= -1.1;
      this.bounceCooldown = 150;
    } else if (
      this.ball.dx > 0 && 
      this.ball.x + this.ball.radius >= this.paddle2.x &&
      this.ball.x < this.paddle2.x + this.paddle2.width &&
      this.ball.y > this.paddle2.y - 2 &&
      this.ball.y < this.paddle2.y + this.paddle2.height + 2 &&
      this.bounceCooldown <= 0
    ) {
      this.ball.dx *= -1.1;
      this.bounceCooldown = 150;
    }

		// Ball collision with left and right screen boundaries and award score.
		if (this.ball.x - this.ball.radius < -20) {
			this.score.playerTwo += 1;
      console.log(`player 2 scored`);
			this.resetBall();
		} else if (this.ball.x + this.ball.radius > 20) {
      this.score.playerOne += 1;
      console.log(`player 1 scored`);
			this.resetBall();
		}
	}

	resetBall() {
		this.ball = { x: 0, y: 0, dx: 0.2, dy: 0.2, radius: 0.5 };
	}

	getPlayerCount(): number {
		return [this.playerOne, this.playerTwo].filter(Boolean).length;
	}

	isEmpty(): boolean {
		return this.getPlayerCount() === 0;
	}

	hasPlayer(id: string): boolean {
		return this.playerOne === id || this.playerTwo === id;
	}
}