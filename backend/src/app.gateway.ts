import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import e from 'express';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard)
@Injectable()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    // private readonly socketManager: SocketManagerService, // Inject SocketManagerService
  ) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
  }

  @UseGuards(AuthGuard)
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      const decoded = this.jwtService.verify(token);

      if (decoded.pre_auth == true) {
        client.emit('disconnected', { message: 'Need 2FA' });
        client.disconnect();
      }
      // console.log(`test: ${decoded.sub}`);

      // see if user is already logged in
      const userAlreadyLoggedIn = await this.prisma.user.findUnique({
        where: { username: decoded.username },
        select: { isOnline: true, socket: true },
      })
      if (userAlreadyLoggedIn.isOnline == true) {
        console.log (`User: ${decoded.username} is already online!`);
        const userSocket = this.server.sockets.sockets.get(userAlreadyLoggedIn.socket);
        if (userSocket) {
          console.log('found old socket, disconnecting');
          userSocket.emit('disconnected', { message: 'You have logged in on another instance. You are being logged out here.'});
          userSocket.disconnect();
        } else {
          console.log('could not find old socket');
        }
      }

      // Store the socket.id in the database
      await this.prisma.user.update({
        where: { username: decoded.username },
        data: { socket: client.id, isOnline: true }
      })

      console.log(`Client connected in app: ${client.id} ${decoded.username}`);
      client.emit('connected', { message: 'Welcome to Transcendence!' });
      client.broadcast.emit('userStatusUpdate', {
        username: decoded.username,
        userId: decoded.sub,
        isOnline: true,
        isInGame: false,
        isInQueue: false,
        // avatar: 
      })
    } catch (error) {
      console.log('Invalid token, disconnecting client');
      client.disconnect();
    }


  }

  //todo: figure out why juicer is not found
  async handleDisconnect(client: Socket) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { socket: client.id},
      });
      if (!user) {
        console.log('juicer not found');
        return;
      }
      
      //todo: maybe move to seperate findUserFromSocketIdToday
      // Find the user by ID and clear the socket ID field
      this.prisma.user.update({
        where: { id: user.id },
        data: { socket: null, isOnline: false, isInGame: false, isInQueue: false },
      });

      client.broadcast.emit('userStatusUpdate', {
        username: user.username,
        userId: user.id,
        isOnline: false,
        isInGame: false,
        isInQueue: false,
      })

      console.log(`SOCKET DISCONNECTED: ${client.id}`);
    } catch (error) {
      console.log('Error handling disconnect:', error);
    }
  }



  // Handle "joinGame" event from client
  @SubscribeMessage('logOut')
  async handleLogOut(client: Socket, userId: number): Promise<void> {
    // this.handleDisconnect(client);
    // console.log(`logging out user:  `, userId);
    // if (!client) {
    //   console.log('No socket');
    //   return;
    // }
    // if (!userId) {
    //   console.log('No userId provided for logOut');
    //   return;
    // }

    // const user = await this.prisma.user.findUnique({
    //   where: { id: userId }
    // })
    // if (!user) {
    //   console.log('User is not real, and therefore cannot logout')
    //   return;
    // }
    // //set user status
    // await this.prisma.user.update({
    //   where: {
    //     id: userId,
    //   },
    //   data: {
    //     isInGame: false,
    //     isInQueue: false,
    //     isOnline: false,
    //   }
    // })

    // //disconnect user from channels
    // const channels = await this.prisma.channel.findMany({
    //   where: {
    //     users: {
    //       has: user.username
    //     }
    //   }
    // })

    // for (const channel of channels) {
    //   await this.prisma.channel.update({
    //     where: { id: channel.id },
    //     data: {
    //       users: {
    //         set: channel.users.filter((username) => username !== user.username)
    //       }
    //     }
    //   })
    // }
  }


  // Method to send messages or data to a specific user using the socket object
  async sendMessageToUser(userId: number, event: string, data: any) {
	const user = await this.prisma.user.findUnique({
		where: { id: userId },
		select: {
			socket: true,
		}
	})
	if (!user)
		return;
    const socket = this.server.sockets.sockets.get(user.socket);
    if (socket) {
      socket.emit(event, data);
    }
  }
}