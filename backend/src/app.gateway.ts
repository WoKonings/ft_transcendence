import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import e from 'express';
import { PayloadSizeGuard } from './auth/payload-size.guard';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard, PayloadSizeGuard)
@Injectable()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      const decoded = this.jwtService.verify(token);

      if (decoded.pre_auth == true) {
        client.emit('disconnected', { message: 'Need 2FA' });
        client.disconnect();
      }

      // see if user is already logged in
      const userAlreadyLoggedIn = await this.prisma.user.findUnique({
        where: { id: decoded.id },
        select: { isOnline: true, socket: true },
      })
      if (userAlreadyLoggedIn.isOnline === true) {
        console.log (`User: ${decoded.username} is already online!`);
        const userSocket = this.server.sockets.sockets.get(userAlreadyLoggedIn.socket);
        if (userSocket) {
          console.log('found old socket, disconnecting');
          userSocket.emit('disconnected', { message: 'You have logged in on another instance. You are being logged out here.'});
          await userSocket.disconnect();
          setTimeout(async () => {
            await this.prisma.user.update({
              where: { username: decoded.username },
              data: { socket: client.id, isOnline: true },
            });
          }, 100)
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
        userId: decoded.id,
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

  async handleDisconnect(client: Socket) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { socket: client.id},
      });
      if (!user) {
        // console.log('user not found');
        return;
      }
      
     await this.prisma.user.update({
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
}