import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, forwardRef, UseGuards } from '@nestjs/common';
import { GameState } from './game.state';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { JoinGameDto } from './dto/join-game.dto';
import { PlayerMoveDto } from './dto/player-move.dto';
import { LeaveGameDto } from './dto/leave-game.dto';
// import { UUID } from 'typeorm/driver/mongodb/bson.typings';
// import { randomUUID } from 'crypto';
// import { JwtService } from '@nestjs/jwt';

//todo: think about adding player stats if we want them visible in the lobby?
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
// @UseGuards(AuthGuard)
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

  @SubscribeMessage('leaveGame')
  handleLeaveGame(client: Socket, data: LeaveGameDto): void {
    const { userId, username } = data;
    if (!userId) {
      console.log('No userId provided for leave_game');
      return;
    }
    console.log(`${username} leaving the game`);

    const game = this.getGameSessionForUser(userId);
    if (!game) {
      console.log(`user: ${username} is not in a game to leave.`);
      return;
    }
    console.log(`removed paddle from user: ${username}`);

    if (game.player_one && game.player_one.userId === userId) {
      console.log('player one bailed');
      if (game.player_two)
        game.player_two.socket.emit('opponentLeft', game.player_one.username);
      game.player_one = null;
      game.gameState.playerOne = null;
    } else if (game.player_two && game.player_two.userId === userId) {
      console.log('player two bailed');
      if (game.player_one)
        game.player_one.socket.emit('opponentLeft', game.player_two.username);
      game.player_two = null;
      game.gameState.playerTwo = null;
    }
    game.paused = true;
    console.log('The game is now paused');
    if (!game.player_one && !game.player_two) {
      console.log('Both players are gone. Deleting game instance');
      this.gameSessions.delete(game.gameId);
    }
  }
        
  // Handle "joinGame" event from client
  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, data: JoinGameDto): void {
    const { userId, username } = data;

    if (!client) {
      console.log('No socket');
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

    this.assignUserToRoom(client, userId, username);
    const session = this.getGameSessionForUser(userId);
    client.emit('gameJoined', session.player_one.userId === userId ? 1 : 2);
    if (!session) {
      console.log('cannot find user session to add paddle');
      return;
    }
    if (session.player_one && session.player_one.userId === userId)
      session.gameState.paddle1 = { x: -14, y: 0, width: 1, height: 4, dy: 0 };
    if (session.player_two && session.player_two.userId === userId)
      session.gameState.paddle2 = { x: 14, y: 0, width: 1, height: 4, dy: 0 };
    if (session.player_one && session.player_two) {
      console.log('GAME IS NOW STARTING!');
      session.player_one.socket.emit('opponentJoined', session.player_two.username);
      session.player_two.socket.emit('opponentJoined', session.player_one.username);
      session.paused = false;
    }
    this.userService.setIsInGame(Number(userId), true);
  }

        
  // Assign user to a game room or create a new one
  assignUserToRoom(client: Socket, userId: string, username: string) {
    const availableSession = this.findAvailableSession();
    
    if (availableSession) {
      console.log('joining session!');
      // Notify the existing player about the new opponent
      if (availableSession.player_one == null) {
        availableSession.player_one = { userId, socket: client, username }; //todo: maybe add more data?
        availableSession.gameState.playerOne = userId;
        console.log(`${username} joined lobby as player one`);
      }
      else if (availableSession.player_two == null) {
        availableSession.player_two = { userId, socket: client, username };
        availableSession.gameState.playerTwo = userId;
        console.log(`${username} joined lobby as player two`);
      }
    } else {
      const newGameState = new GameState();
      newGameState.playerOne = userId;
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
  handlePlayerMove(client: Socket, data: PlayerMoveDto): void {
    const { userId, y } = data;
    if (!userId) {
      console.log('No userId provided for playerMove');
      return;
    }

    const gameSession = this.getGameSessionForUser(userId);
    if (gameSession) {
      gameSession.gameState.updatePlayerPosition(userId, y);
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
          if (session.gameState.score.playerOne >= 7)
          {
            this.handleGameOver(session.player_one, session.player_two);
            session.gameState.score.playerOne = 0;
            session.gameState.score.playerTwo = 0;
            session.paused = true;
          }
          if (session.gameState.score.playerTwo >= 7)
          {
            this.handleGameOver(session.player_two, session.player_one);
            session.gameState.score.playerOne = 0;
            session.gameState.score.playerTwo = 0;
            session.paused = true;
          }
          session.player_one.socket.emit('update', session.gameState);
          session.player_two.socket.emit('update', session.gameState);
        };
      });
    }, 1000 / 60); // 60 FPS
	}

  async handleGameOver(winner: Player, loser: Player) {
		try {
			await this.prisma.user.update({
				where: { id: Number(winner.userId) },
				data: {
					gamesPlayed: { increment: 1 },
					gamesWon: { increment: 1 },
				},
			});
			await this.prisma.user.update({
				where: { id: Number(loser.userId) },
				data: {
					gamesPlayed: { increment: 1 },
				},
			});

			// You can also emit an event to the client, log the result, etc.
			console.log(`Game over: ${winner.username} won against ${loser.username}`);
      winner.socket.emit('gameWon');
      loser.socket.emit('gameLost');

		} catch (error) {
			console.error('Error updating game stats:', error);
		}
	}

  async handleDisconnect(client: Socket) {
    console.log("Handle disconnect in game gateway!");
    try {
      // Find the session the client belongs to and remove them
      this.gameSessions.forEach((session, sessionId) => {
        if (session.player_one && session.player_one.socket.id === client.id) {
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