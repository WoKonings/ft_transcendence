import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, forwardRef, UseGuards, Req } from '@nestjs/common';
import { GameState } from './game.state';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { JoinGameDto } from './dto/join-game.dto';
import { PlayerMoveDto } from './dto/player-move.dto';
import { LeaveGameDto } from './dto/leave-game.dto';
import { InviteGameDto } from './dto/invite-game.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { PayloadSizeGuard } from 'src/auth/payload-size.guard';

interface Player {
  username: string;
	userId: string;
	socket: Socket;
  elo: number;
}

interface GameSession {
  player_one: Player;
  player_two: Player;
  gameId: string;

  gameState: GameState;
  isPrivate: boolean;
  bigPong: boolean;
  paused: boolean;

  startTime: number;
  endTime: number;
}

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard, PayloadSizeGuard)
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

  async handleConnection(client: Socket) {
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(client: Socket): void {
    const userId = client['user']?.sub;
    const username = client['user']?.username;

    if (!userId) {
      console.log('No userId provided for leave_game');
      return;
    }
    console.log(`${username} leaving the game`);

    const game = this.getGameSessionForUser(userId);
    if (!game) {
      // console.log(`user: ${username} is not in a game to leave.`);
      return;
    }
    this.userService.setIsInGame(Number(userId), false);
    client.broadcast.emit('userStatusUpdate', {
      username: username,
      userId: userId,
      isInGame: false,
      isInQueue: false,
    })

    if (game.player_one && game.player_one.userId === userId) {
      game.gameState.score.playerTwo = 7;
      this.handleGameOver(game.player_two, game.player_one, game);
      if (game.player_two)
        game.player_two.socket.emit('opponentLeft', game.player_one.username);
      game.player_one = null;
      game.gameState.playerOne = null;
    } else if (game.player_two && game.player_two.userId === userId) {
      game.gameState.score.playerOne = 7;
      this.handleGameOver(game.player_one, game.player_two, game);
      if (game.player_one)
        game.player_one.socket.emit('opponentLeft', game.player_two.username);
      game.player_two = null;
      game.gameState.playerTwo = null;
    }
    game.paused = true;
    console.log('The game is now FORFEITED');
    this.gameSessions.delete(game.gameId);
    if (!game.player_one && !game.player_two) {
      console.log('Both players are gone. Deleting game instance');
    }
  }
        
  // Handle "joinGame" event from client
  @SubscribeMessage('joinGame')
  async handleJoinGame(client: Socket, data: JoinGameDto) {
    const { isPrivate = false, bigPong} = data;
    const userId = client['user']?.id;
    const username = client['user']?.username;
    if (!client) {
      console.log('No socket');
      return;
    }
    if (!userId) {
      console.log('No userId in jwt token');
      return;
    }
    if (!username) {
      console.log('No username provided for join_game');
      return;
    }
    const user = await this.userService.getUserById(userId);

    if (!user) {
      console.log(`Wrong userId to join game`);
      return;
    }
    let session = this.getGameSessionForUser(userId); //ensure user ISNT already in a room
    if (session) {
      console.log('already in a session');
      return;
    }
    this.assignUserToRoom(client, userId, username, isPrivate, bigPong, user.elo);
    session = this.getGameSessionForUser(userId); //check that user joined a room
    if (!session) {
      console.log('joining session failed');
      return;
    }
    client.emit('gameJoined', session.player_one.userId === userId ? 1 : 2);
    this.userService.setIsInQueue(Number(userId), true);
    client.broadcast.emit('userStatusUpdate', {
      username: username,
      userId: userId,
      isInQueue: true,
    })
    if (session.player_one && session.player_two) {
      console.log('GAME IS NOW STARTING!');
      session.startTime = Date.now();
      session.player_one.socket.emit('opponentJoined', session.player_two.username);
      session.player_two.socket.emit('opponentJoined', session.player_one.username);
      session.paused = false;
      this.userService.setIsInGame(Number(session.player_one.userId), true);
      session.player_one.socket.broadcast.emit('userStatusUpdate', {
        username: session.player_one.username,
        userId: session.player_one.userId,
        isInGame: true,
        isInQueue: false,
      });
      this.userService.setIsInGame(Number(session.player_two.userId), true);
      session.player_two.socket.broadcast.emit('userStatusUpdate', {
        username: session.player_two.username,
        userId: session.player_two.userId,
        isInGame: true,
        isInQueue: false,
      });
    }
  }

@SubscribeMessage('sendGameInvite')
async handleInviteGame(client: Socket, data: InviteGameDto) {
	try {
		const { targetName } = data;
    const senderId = client['user']?.id;
    const senderName = client['user']?.username;

		if (!client) {
			console.log('No socket in handleInviteGame');
			return;
		}
		if (!targetName) {
			console.log('No target username to invite');
			return;
		}
		if (!senderName) {
			console.log('No username for invite game');
			return;
		}
    if (!senderId) {
      console.log('No senderId for invite game');
    }

		const target = await this.userService.getUserByUsername(targetName);
		if (!target) {
			console.log('Invited user does not exist');
			return;
		}

		const targetSocket = this.server.sockets.sockets.get(target.socket);
		if (!targetSocket) {
			console.log(`Socket not found for user: ${targetName}`);
			return;
		}

    let session = this.getGameSessionForUser(senderId);
    if (!session) {
      await this.handleJoinGame(client, {
        isPrivate: true,
        bigPong: false,
      });
      session = this.getGameSessionForUser(senderId);
      if (!session) {
        console.log (`somehow could not create session for ${senderName}...`);
        return;
      }
      this.gameSessions.set(session.gameId, session);
    }
    console.log(`TEST: ${session.gameId}`)
		targetSocket.emit('gameInvite', {
			sender: senderName,
			target: targetName,
      gameId: session.gameId, 
			message: `You have been invited to a game by ${senderName}!`,
		});

	} catch (error) {
		console.error('Error handling invite game:', error);
    }
  }

  @SubscribeMessage('acceptInvite')
  async acceptGameInvite(client: Socket, data: AcceptInviteDto) {
    console.log ('accepting data: ', data)
    const { gameId } = data;
    const session = this.gameSessions.get(gameId);
    const userId = client['user']?.id;
    const username = client['user']?.username;
    const user = await this.userService.getUserById(userId);

    if (!user) {
      console.log(`Wrong userId to accept invite`);
      return;
    }
    if (!session) {
      console.log(`No game session found for gameId: ${gameId}`);
      // client.emit('inviteError', { message: 'Game session not found.' });
      return;
    }
    if (session.player_one == null) {
      session.player_one = { userId, socket: client, username, elo: user.elo };
      session.gameState.playerOne = userId;
      console.log(`${username} joined lobby as player one`);
    }
    else if (session.player_two == null) {
      session.player_two = { userId, socket: client, username, elo: user.elo };
      session.gameState.playerTwo = userId;
      console.log(`${username} joined lobby as player two`);
    }
    client.emit('gameJoined', session.player_one.userId === userId ? 1 : 2);
    if (session.player_one && session.player_two) {
      console.log(`GAME IS NOW STARTING! p1: ${session.player_one.username} p2: ${session.player_two.username}`);
      session.startTime = Date.now();
      session.player_one.socket.emit('opponentJoined', session.player_two.username);
      session.player_two.socket.emit('opponentJoined', session.player_one.username);
      session.paused = false;
      await this.userService.setIsInGame(Number(session.player_one.userId), true);
      session.player_one.socket.broadcast.emit('userStatusUpdate', {
        username: session.player_one.username,
        userId: session.player_one.userId,
        isInGame: true,
        isInQueue: false,
      });
      await this.userService.setIsInGame(Number(session.player_two.userId), true);
      session.player_two.socket.broadcast.emit('userStatusUpdate', {
        username: session.player_two.username,
        userId: session.player_two.userId,
        isInGame: true,
        isInQueue: false,
      });
    }
    await this.userService.setIsInGame(Number(userId), true);
  }

  // Assign user to a game room or create a new one
  assignUserToRoom(client: Socket, userId: string, username: string, isPrivate: boolean, bigPong: boolean, elo: number) {
    const session = this.findAvailableSession(bigPong);
    if (session) {
      console.log('joining session!');
      // Notify the existing player about the new opponent
      if (session.player_one == null) {
        session.player_one = { userId, socket: client, username, elo };
        session.gameState.playerOne = userId;
        console.log(`${username} joined lobby as player one`);
      }
      else if (session.player_two == null) {
        session.player_two = { userId, socket: client, username, elo };
        session.gameState.playerTwo = userId;
        console.log(`${username} joined lobby as player two`);
      }
    } else {
      const newGameState = new GameState();
      newGameState.playerOne = userId;
      newGameState.bigPong = bigPong;
      const newSession: GameSession = {
        player_one: { userId, socket: client, username, elo },
        player_two: null,
        gameState: newGameState,
        isPrivate: isPrivate,
        bigPong: bigPong,
        paused: true,
        gameId: crypto.randomUUID(),
        startTime: null,
        endTime: null,
      };
      console.log(`creating new gamesession: ${newSession.gameId}`);
      if (bigPong)
        console.log('CREATED BIG PONG SESH');
      console.log(`${username} joined lobby as player one`);
      this.gameSessions.set(newSession.gameId, newSession);
    }
  }
  
  // Find an available public session that isn't full
  private findAvailableSession(bigPong: boolean): GameSession | undefined {
    console.log('searching available session');
    for (const session of this.gameSessions.values()) {
      if (session.isPrivate == false && session.bigPong == bigPong) {
        if (session.player_one == null || session.player_two == null) {
          return session;
        }
      }
    }
    console.log('no session found');
    return undefined;
  }

  @SubscribeMessage('playerMoveKBM')
  handlePlayerMoveUp(client: Socket, data: PlayerMoveDto): void {
    const userId = client['user']?.sub;
    let { dy } = data;
    if (!userId) {
      console.log('No userId provided for playerMove');
      return;
    }

    const gameSession = this.getGameSessionForUser(userId);
    if (!gameSession) {
      return;
    }

    const speed = 0.5;
    // set speed value depending on player direction
    if (dy > 0)
      dy = speed;
    if (dy < 0)
      dy = -speed;

    if (gameSession.player_one.userId == userId)
      gameSession.gameState.paddle1.dy = dy;
    else if (gameSession.player_two.userId == userId)
      gameSession.gameState.paddle2.dy = dy;
  }


  // finds if the userId (as a string) is in a game, and returns the session if they are.
  private getGameSessionForUser(userId: string): GameSession | undefined {
    const user_Id = userId;
    if (!user_Id) {
      console.log('No userId provided for getGameSessionForUser')
      return undefined;
    }
    for (const session of this.gameSessions.values()) {
      if ((session.player_one && session.player_one.userId === userId)
         || (session.player_two && session.player_two.userId === userId)) {
        return session;
      }
    }
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
            this.handleGameOver(session.player_one, session.player_two, session);
            session.paused = true;
          }
          if (session.gameState.score.playerTwo >= 7)
          {
            this.handleGameOver(session.player_two, session.player_one, session);
            session.paused = true;
          }
          session.player_one.socket.emit('update', session.gameState);
          session.player_two.socket.emit('update', session.gameState);
        };
      });
    }, 1000 / 60); // 60 FPS
	}

  async handleGameOver(winner: Player, loser: Player, gameSession: GameSession) {
    if (!winner || !loser) {
      console.log('one of the players is missing, cancelling save!');
      return;
    }
    if (winner.userId == loser.userId || winner.username == loser.username) {
      console.log('players are the same player...')
      return;
    }
    try {
      const eloChange = this.calculateEloChange(winner.elo, loser.elo);
      // const eloChange = 69;
      
      // Update winner's stats
      await this.prisma.user.update({
        where: { id: Number(winner.userId) },
        data: {
          gamesPlayed: { increment: 1 },
          gameWins: { increment: 1 },
          elo: { increment: eloChange },
          isInGame: false,
          isInQueue: false,
        },
      });
  
      // Update loser's stats
      await this.prisma.user.update({
        where: { id: Number(loser.userId) },
        data: {
          gamesPlayed: { increment: 1 },
          elo: { decrement: eloChange },
          isInGame: false,
          isInQueue: false,
        },
      });
  
      // Store game data in the Game model
      console.log (`score 1: ${gameSession.gameState.score.playerOne} 2: ${gameSession.gameState.score.playerTwo}`);
      await this.prisma.game.create({
        data: {
          players: {
            connect: [{ id: Number(winner.userId) }, { id: Number(loser.userId) }],
          },
          playerScores: [gameSession.gameState.score.playerOne, gameSession.gameState.score.playerTwo],
          playerEloChanges: [eloChange, -eloChange], // Positive for winner, negative for loser
          winner: { connect: { id: Number(winner.userId) } },
          startTime: new Date(gameSession.startTime),
          endTime: new Date(Date.now()), // Use game end time
        },
      });
  
      console.log(`Game over: ${winner.username} won against ${loser.username}`);
      winner.socket.emit('gameWon');
      loser.socket.emit('gameLost');

      winner.socket.broadcast.emit('userStatusUpdate', {
        username: winner.username,
        userId: winner.userId,
        isInGame: false,
        isInQueue: false,
      });

      loser.socket.broadcast.emit('userStatusUpdate', {
        username: loser.username,
        userId: loser.userId,
        isInGame: false,
        isInQueue: false,
      });
      console.log('game is cleaned up');
      this.gameSessions.delete(gameSession.gameId);
  
    } catch (error) {
      console.error('Error updating game stats:', error);
    }
  }

  calculateEloChange(winnerElo: number, loserElo: number): number {
    const kFactor = 32;
  
    // Expected scores
    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  
    // Elo change calculation
    const eloChangeWinner = Math.round(kFactor * (1 - expectedScoreWinner));
    const eloChangeLoser = Math.round(kFactor * (0 - expectedScoreLoser));
  
    return eloChangeWinner;
  }

  async handleDisconnect(client: Socket) {
    try {
      // Find the session the client belongs to and remove them
      this.gameSessions.forEach((session, sessionId) => {
        if (session.player_one && session.player_one.socket.id === client.id) {
          this.handleLeaveGame(client);
          console.log(`Player one disconnected from session: ${sessionId}`);
        } else if (session.player_two && session.player_two.socket.id === client.id) {
          this.handleLeaveGame(client);
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