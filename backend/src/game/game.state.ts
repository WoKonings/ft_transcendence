import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class GameState {
  ball: { x: number, y: number, dx: number, dy: number, radius: number };
  paddle1: { x: number, y: number, width: number, height: number, dy: number };
  paddle2: { x: number, y: number, width: number, height: number, dy: number };
  gamesWon: { playerOne: number, playerTwo: number};
  score: { playerOne: number, playerTwo: number };
  playerOne: string | null;
  playerTwo: string | null;
  bounceCooldown: number;
  lastUpdateTime: number;
	// private userService: UserService;

	constructor() {
		this.resetBall();
		this.paddle1 = { x: -14, y: 0, width: 1, height: 4, dy: 0 };
		this.paddle2 = { x: 14, y: 0, width: 1, height: 4, dy: 0 };
		this.score = { playerOne: 0, playerTwo: 0 };
		this.gamesWon = { playerOne: 0, playerTwo: 0 }
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
		//todo: fix
		if (
			this.ball.x - this.ball.radius < this.paddle1.x + this.paddle1.width &&
			this.ball.y > this.paddle1.y - 2 &&
			this.ball.y < this.paddle1.y + this.paddle1.height - 2 &&
			this.bounceCooldown <= 0
		) {
			this.ball.dx *= -1.1;
			this.bounceCooldown = 150;
		} else if (
			this.ball.x + this.ball.radius > this.paddle2.x &&
			this.ball.y > this.paddle2.y - 2 &&
			this.ball.y < this.paddle2.y + this.paddle2.height - 2 &&
			this.bounceCooldown <= 0
		) {
			this.ball.dx *= -1.1;
			this.bounceCooldown = 150;
		}

		// Ball collision with left and right screen boundaries and award score.
		if (this.ball.x - this.ball.radius < -20) {
			this.score.playerTwo += 1;
      console.log(`player 2 scored`);
      // if (this.score.playerTwo >= 7) {
      //   this.score.playerOne = 0;
      //   this.score.playerTwo = 0;
      //   this.gamesWon.playerTwo += 1;
      // }
			this.resetBall();
		} else if (this.ball.x + this.ball.radius > 20) {
      this.score.playerOne += 1;
      console.log(`player 1 scored`);
      // if (this.score.playerOne >= 7) {
      //   this.score.playerOne = 0;
      //   this.score.playerTwo = 0;
      //   this.gamesWon.playerOne += 1;
      // }
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


// import { Injectable } from '@nestjs/common';
// import { UserService } from '../user/user.service';

// @Injectable()
// export class GameState {
//   ball: { x: number, y: number, dx: number, dy: number, radius: number };
// //   paddles: { [key: string]: { x: number, y: number, width: number, height: number, dy: number } };
//   paddle1: { x: number, y: number, width: number, height: number, dy: number };
//   paddle2: { x: number, y: number, width: number, height: number, dy: number };
//   scores: { player_one: number,  player_two: number};
//   players: { [key: string]: boolean };
//   bounceCooldown: number;
//   lastUpdateTime: number;
//   private userService: UserService;

//   constructor() {
//     this.resetBall();
//     this.paddles = {};
//     this.scores = {0, 0};
//     this.players = {};
//     this.bounceCooldown = 0;
//     this.lastUpdateTime = Date.now();
//   }

//   setUserService(userService: UserService) {
//     this.userService = userService;
//   }

//   async addPlayer(id: string) {
//     const user = await this.userService.getUserById(Number(id));
//     if (user) {
//       this.players[id] = true;
//       this.paddles[id] = { x: 30, y: 250, width: 10, height: 100, dy: 0 };
//       this.scores[id] = 0;
//       this.userService.setIsInGame(user.id, true);
//     }
//   }

//   removePlayer(id: string) { //todo: add method to store stats before player leaves.
//     delete this.players[id];
//     delete this.paddles[id];
//     delete this.scores[id];
//     if (Object.keys(this.players).length === 0) {
//       this.resetBall(); //tod: reset the game state when no players are left properly
//     }
//   }

//   updatePlayerPosition(id: string, y: number) {
//     if (!this.paddles[id])
// 		return;
// 	if (y < -13)
// 		y = -13;
// 	if (y > 13)
// 		y = 13;
// 	this.paddles[id].y = y;
//   }

//   update() {
//     const currentTime = Date.now();
//     const deltaTime = currentTime - this.lastUpdateTime;
//     this.lastUpdateTime = currentTime;

//     // Update ball position
//     this.ball.x += this.ball.dx;
//     this.ball.y += this.ball.dy;

//     // Update cooldown timer
//     if (this.bounceCooldown > 0) {
//         this.bounceCooldown -= deltaTime;
//     }

//     // Ball collision with top and bottom screen boundaries
//     if (this.bounceCooldown <= 0 && (this.ball.y - this.ball.radius < -16 || this.ball.y + this.ball.radius > 16)) {
//         this.ball.dy *= -1;
//         this.bounceCooldown = 150;
//     }

//     for (const id in this.paddles) {
//       const paddle = this.paddles[id];
//       if (this.ball.x - this.ball.radius < paddle.x + paddle.width && this.ball.x + this.ball.radius > paddle.x &&
//         this.ball.y > paddle.y - 2 && this.ball.y < paddle.y + paddle.height - 2 && this.bounceCooldown <= 0) {
//         this.ball.dx *= -1.1;
//         this.bounceCooldown = 150;
//       }
//     }
//     // Ball collision with left and right screen boundaries
//     if (this.ball.x - this.ball.radius < -20) {
//         this.resetBall();
//     } else if (this.ball.x + this.ball.radius > 20) {
// 		this.resetBall();
// 	}
// }
//   //todo: make the direction random
//   resetBall() {
//     // this.ball = { x: 400, y: 300, dx: 4, dy: 4, radius: 10 }; //2d
//     this.ball = { x: 0, y: 0, dx: 0.2, dy: 0.2, radius: 0.5 };
//   }

//   getPlayerCount(): number {
//     return Object.keys(this.players).length;
//   }

//   isEmpty(): boolean {
//     return this.getPlayerCount() === 0;
//   }

//   hasPlayer(id: string): boolean {
//     return !!this.players[id];
//   }
// }
