import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { GameState } from './game.state';
import { UserService } from '../user/user.service';

@WebSocketGateway({ cors: true })
@Injectable()
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private intervalId: NodeJS.Timeout;
  private activeUsers: Map<string, Socket> = new Map();
  private gameSessions: Map<string, GameState> = new Map();


  constructor(
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly gameState: GameState,
  ) {
    this.gameState.setUserService(this.userService); // Set UserService in GameState
  }

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    this.startGameLoop();
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      console.log('No userId provided, disconnecting client');
      client.disconnect();
      return;
    }

    console.log(`Client connected: ${userId}`);
    this.activeUsers.set(userId, client);
	client.emit('connected', { message: 'welcome to transcendence'});
    this.gameState.addPlayer(userId);
  }

  handleDisconnect(client: Socket) {
	const userId = client.handshake.query.userId as string;
    // const userId = Array.isArray(client.handshake.query.userId) ? client.handshake.query.userId[0] : client.handshake.query.userId;
    if (!userId) {
      console.log('No userId provided, cant disconnect?');
      return;
    }

    console.log(`Client disconnected: ${userId}`);
    this.activeUsers.delete(userId);
    this.gameState.removePlayer(userId);
  }

  @SubscribeMessage('playerMove')
  handlePlayerMove(client: Socket, data: { y: number }): void {
	const userId = client.handshake.query.userId as string;
    if (!userId) {
      console.log('No userId provided for playerMove');
      return;
    }

    this.gameState.updatePlayerPosition(userId, data.y);
  }

	startGameLoop() {
		console.log("starting game!");
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
		this.intervalId = setInterval(() => {
			this.gameState.update(); // Ensure the game state is updated
			let gameState = {
				ball: this.gameState.ball,
				paddles: this.gameState.paddles,
				scores: this.gameState.scores,
				players: this.gameState.players,
			};
			// console.log(`ball pos: ${this.gameState.ball.x} ${this.gameState.ball.y}`);
			this.server.emit('update', gameState); // Emit the updated game state
		}, 1000 / 60); // 60 FPS
	}
}