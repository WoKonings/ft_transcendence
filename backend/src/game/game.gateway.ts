import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, forwardRef, UseGuards } from '@nestjs/common';
import { GameState } from './game.state';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';
// import { UUID } from 'typeorm/driver/mongodb/bson.typings';
// import { randomUUID } from 'crypto';
// import { JwtService } from '@nestjs/jwt';

interface Player {
  username: string;
	userId: string;
	socket: Socket;
}

interface GameSession {
  player_one: Player;
  player_two: Player;
	gameState: GameState;
  paused: boolean;
  gameId: string;
}

@WebSocketGateway({ cors: true })
@Injectable()
export class GameGateway {
  @WebSocketServer() server: Server;
  private intervalId: NodeJS.Timeout;
  private gameSessions: Map<string, GameSession> = new Map();

  constructor(
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {
  }
  
  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    this.startGameLoop();
  }

  // Handle user disconnect
  @SubscribeMessage('leaveGame')
  handleLeaveGame(client: Socket, data: { userId: string, username: string }): void {
    const userId = data.userId;
	const username = data.username;
    if (!userId) {
      console.log('No userId provided for leave_game');
      return;
    }
    console.log(`${data.username} leaving the game`);

    const game = this.getGameSessionForUser(userId)
    if (!game)
    {
      console.log(`user: ${username} is not in a game to leave.`);
      return;
    }
    game.gameState.removePlayer(userId);
    console.log(`removed paddle from user: ${username}`);

    //notify other player, and set leaving player to null.
    if (game.player_one && game.player_one.userId == userId)
    {
      console.log('player one bailed'); 
      if (game.player_two)
        game.player_two.socket.emit('opponentLeft', game.player_one.username);
      game.player_one = null;
    }
    else if (game.player_two && game.player_two.userId == userId)
    {
      console.log('player two bailed');
      if (game.player_one)
        game.player_one.socket.emit('opponentLeft', game.player_two.username);
      game.player_two = null;
    }
    game.paused = true;
    console.log('The game is now paused');
    if (!game.player_one && !game.player_two)
    {
      console.log('Both players are gone. Deleting game instance');
      this.gameSessions.delete(game.gameId);
    }
  }
        
  // Handle "join_game" event from client
  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, data: { userId: string, username: string }): void {
    const userId = data.userId;
    const username = data.username;
  
    if (!client)
    {
      console.log('No socket')
      return;
    }
    if (!userId) {
      console.log('No userId provided for join_game');
      return;
    }
    if (!username) {
      console.log('No username provided for join_game');
      return;
    }
  
    // Assign the user to a game room
    this.assignUserToRoom(client, userId, username);
    client.emit('game_joined', { success: true, message: 'Joined game room successfully.' });
    let session = this.getGameSessionForUser(userId);
    if (!session)
    {
      console.log('cannot find user session to add paddle');
      return;
    }
    if (session.player_one && session.player_one.userId == userId)
      session.gameState.paddles[userId] = {x: -14, y: 0, width: 1, height: 4, dy: 0};
    // session.gameState.paddles[userId] = {x: 30, y: 250, width: 10, height: 100, dy: 0}; // used to be x30 y250 h100 w10 dy0
    if (session.player_two && session.player_two.userId == userId)
      session.gameState.paddles[userId] = {x: 14, y: 0, width: 1, height: 4, dy: 0};
    // session.gameState.paddles[userId] = {x: 760, y: 250, width: 10, height: 100, dy: 0}; //used to be x760: y250 100 w10 dy0
    if (session.player_one != null && session.player_two != null)
    {
      console.log('GAME IS NOW STARTING!');
      session.player_one.socket.emit('opponentJoined', session.player_two.username);
      session.player_two.socket.emit('opponentJoined', session.player_one.username);
      session.paused = false;
    }
  }
        
  // Assign user to a game room or create a new one
  assignUserToRoom(client: Socket, userId: string, username: string) {
    const availableSession = this.findAvailableSession();
    
    if (availableSession) {
      console.log('joining session!');
      // Notify the existing player about the new opponent
      if (availableSession.player_one == null) {
        availableSession.player_one = { userId, socket: client, username }; //todo: maybe add more data?
        console.log(`${username} joined lobby as player one`);
      }
      else if (availableSession.player_two == null) {
        availableSession.player_two = { userId, socket: client, username };
        console.log(`${username} joined lobby as player two`);
      }
    } else {
      const newGameState = new GameState();
      const newSession: GameSession = {
        player_one: { userId, socket: client, username },
        player_two: null,
        gameState: newGameState,
        paused: true,
        gameId: crypto.randomUUID(),
      };
      console.log(`creating new gamesession: ${newSession.gameId}`);
      console.log(`${username} joined lobby as player one`);
      this.gameSessions.set(newSession.gameId, newSession);
    }
  }
  
  // Find an available session that isn't full
  private findAvailableSession(): GameSession | undefined {
    console.log('searching available session');
    for (const session of this.gameSessions.values()) {
      if (session.player_one == null || session.player_two == null) {
        return session;
      }
    }
    console.log('no session found');
    return undefined;
  }
        
  @SubscribeMessage('playerMove')
  handlePlayerMove(client: Socket, data: { userId: string, y: number }): void {
    const userId = data.userId;
    if (!userId) {
      console.log('No userId provided for playerMove');
      return;
    }
    
    const gameSession = this.getGameSessionForUser(userId);
    if (gameSession) {
      gameSession.gameState.updatePlayerPosition(userId, data.y);
    //   console.log(`y updated to: ${data.y} vs ball y: ${gameSession.gameState.ball.y}`);
    }
  }
  
  // finds if the user is in a game, and returns the session if they are.
  private getGameSessionForUser(userId: string): GameSession | undefined {
    const user_Id = userId;
    if (!user_Id)
    {
      console.log('No userId provided for getGameSessionForUser')
      return undefined;
    }
    for (const session of this.gameSessions.values()) {
      if ((session.player_one && session.player_one.userId === userId)
         || (session.player_two && session.player_two.userId === userId)) {
        return session;
      }
    }
      console.log('CANNOT FIND USERS SESSION'); //todo: some way to detect the user is not actually ingame and reset their state?
      return undefined;
    }
    
  startGameLoop() {
    console.log("starting game!");
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.gameSessions.forEach(session => {
        if (session.paused == false)
        {
          session.gameState.update();
          let newGameState = {
            ball: session.gameState.ball,
            paddles: session.gameState.paddles,
            scores: session.gameState.scores,
            players: session.gameState.players,
          }
          // this.server.emit('update', newGameState);
          session.player_one.socket.emit('update', newGameState);
          session.player_two.socket.emit('update', newGameState);
        };
      });
    }, 1000 / 60); // 60 FPS
	}

  async handleDisconnect(client: Socket) {
    console.log("Handle disconnect in game gateway!");
    try {
      // Find the session the client belongs to and remove them
      this.gameSessions.forEach((session, sessionId) => {
        if (session.player_one && session.player_one.socket.id === client.id) {
          // session.player_one = null;
          this.handleLeaveGame(client, { userId: session.player_one.userId, username: session.player_one.username });
          console.log(`Player one disconnected from session: ${sessionId}`);
        } else if (session.player_two && session.player_two.socket.id === client.id) {
          this.handleLeaveGame(client, { userId: session.player_two.userId, username: session.player_two.username} );
          console.log(`Player two disconnected from session: ${sessionId}`);
        }

        // If both players are disconnected, clean up the session
        if (!session.player_one && !session.player_two) {
          this.gameSessions.delete(sessionId);
          console.log(`Session ${sessionId} closed due to no active players.`);
        }
      });
    } catch (error) {
      console.log('Error handling game disconnect:', error);
    }
  }
}