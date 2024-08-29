import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
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

  @UseGuards(AuthGuard) // Automatically use this guard for authentication
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      const decoded = this.jwtService.verify(token);

      console.log(`test: ${decoded.sub}`);

      // Store the socket.id in the database
      await this.prisma.user.update({
        where: { username: decoded.username},
        data: { socket: client.id }
      })

      console.log(`Client connected in app: ${client.id} ${decoded.username}`);
      client.emit('connected', { message: 'Welcome to Transcendence!' });
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
        data: { socket: null },
      });
      console.log(`SOCKET DISCONNECTED: ${client.id}`);
    } catch (error) {
      console.log('Error handling disconnect:', error);
    }
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