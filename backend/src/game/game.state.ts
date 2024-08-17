import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class GameState {
  ball: { x: number, y: number, dx: number, dy: number, radius: number };
  paddles: { [key: string]: { x: number, y: number, width: number, height: number, dy: number } };
  scores: { [key: string]: number };
  players: { [key: string]: boolean };
  bounceCooldown: number;
  lastUpdateTime: number;
  private userService: UserService;

  constructor() {
    this.resetBall();
    this.paddles = {};
    this.scores = {};
    this.players = {};
    this.bounceCooldown = 0;
    this.lastUpdateTime = Date.now();
  }

  setUserService(userService: UserService) {
    this.userService = userService;
  }

  async addPlayer(id: string) {
    const user = await this.userService.getUserById(Number(id));
    if (user) {
      this.players[id] = true;
      this.paddles[id] = { x: 30, y: 250, width: 10, height: 100, dy: 0 };
      this.scores[id] = 0;
      this.userService.setIsInGame(user.id, true);
    }
  }

  removePlayer(id: string) { //todo: add method to store stats before player leaves.
    delete this.players[id];
    delete this.paddles[id];
    delete this.scores[id];
    if (Object.keys(this.players).length === 0) {
      this.resetBall(); //tod: reset the game state when no players are left properly
    }
  }

  updatePlayerPosition(id: string, y: number) {
    if (!this.paddles[id])
		return;
	if (y < -13)
		y = -13;
	if (y > 13)
		y = 13;
	this.paddles[id].y = y;
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

    for (const id in this.paddles) {
        const paddle = this.paddles[id];
        const paddleTop = paddle.y + paddle.height - 2;
        const paddleBottom = paddle.y - 2;
        const paddleFront = paddle.x + paddle.width;

        // Check collision with paddle front (side)
        if (this.bounceCooldown <= 0 && this.ball.x - this.ball.radius < paddleFront && this.ball.x + this.ball.radius > paddle.x) {
            if (this.ball.y > paddleBottom && this.ball.y < paddleTop) {
                this.ball.dx *= -1.1; // Invert and slightly increase the speed
                this.bounceCooldown = 150;
                // console.log('frontbounce');
			}
            // Check collision with paddle top/bottom
            // if (this.bounceCooldown <= 0 && (this.ball.y + this.ball.radius > paddleTop && this.ball.dy < 0)) {
            //   this.ball.dy *= -1;
            //   this.bounceCooldown = 150; // Set cooldown after bouncing
            //   console.log('topbounce');
	        // } else if (this.bounceCooldown <= 0 && (this.ball.y - this.ball.radius < paddleBottom && this.ball.dy > 0)) {
            // this.ball.dy *= -1;
            // this.bounceCooldown = 150; // Set cooldown after bouncing
            // console.log('bottombounce');
        }
    }

    // Ball collision with left and right screen boundaries
    if (this.ball.x - this.ball.radius < -20 || this.ball.x + this.ball.radius > 20) {
        console.log('reset');
        this.resetBall();
    }
}


// attempted 3d logic
  // update() {
  //   this.ball.x += this.ball.dx;
  //   this.ball.y += this.ball.dy;
    
  //   // Assume Three.js coordinates where -17 < y < 17, map server values accordingly
  //   // if (this.ball.y < -17 || this.ball.y > 17) {
  //   if (this.ball.y - this.ball.radius < -16 || this.ball.y + this.ball.radius > 16) {
  //       this.ball.dy *= -1;
  //   }
    
  //   for (const id in this.paddles) {
  //     const paddle = this.paddles[id];
  //     if (this.ball.x - this.ball.radius < paddle.x + paddle.width && this.ball.x + this.ball.radius > paddle.x &&
  //     this.ball.y > paddle.y - 2 && this.ball.y < paddle.y + paddle.height + 2) {
  //     this.ball.dx *= -1;
  //     // this.ball.dx += 0.05;
  //     // this.ball.dx = Math.max(-10, Math.min(10, this.ball.dx));
  //     }
  //   }
    
  //   // if (this.ball.x < -18 || this.ball.x > 18) {
  //     if (this.ball.x - this.ball.radius < -20 || this.ball.x + this.ball.radius > 20) {
  //       console.log('reset');
  //     this.resetBall();
  //   }
  // }
// old 2d logic
//   update() {
//     this.ball.x += this.ball.dx;
//     this.ball.y += this.ball.dy;

//     if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > 600) {
//       this.ball.dy *= -1;
//     }

//     for (const id in this.paddles) {
//       const paddle = this.paddles[id];
//       if (this.ball.x - this.ball.radius < paddle.x + paddle.width && this.ball.x + this.ball.radius > paddle.x &&
//         this.ball.y > paddle.y && this.ball.y < paddle.y + paddle.height) {
//         this.ball.dx *= -1.1;
//         this.ball.dx = Math.max(-10, Math.min(10, this.ball.dx));
//       }
//     }

//     if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > 800) {
//       this.resetBall();
//     }
//   }

  resetBall() {
    // this.ball = { x: 400, y: 300, dx: 4, dy: 4, radius: 10 }; //2d
    this.ball = { x: 0, y: 0, dx: 0.2, dy: 0.2, radius: 0.5 };
  }

  getPlayerCount(): number {
    return Object.keys(this.players).length;
  }

  isEmpty(): boolean {
    return this.getPlayerCount() === 0;
  }

  hasPlayer(id: string): boolean {
    return !!this.players[id];
  }
}
