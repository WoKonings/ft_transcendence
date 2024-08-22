import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SocketManagerService } from './socket-manager/socket-manager.service';

@WebSocketGateway({ cors: true })
@Injectable()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly socketManager: SocketManagerService, // Inject SocketManagerService
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

      // Store the socket object in the socket map
      this.socketManager.setUserSocket(decoded.sub, client);

      // Store the socket.id in the database
      this.prisma.user.update({
        where: { id: decoded.sub},
        data: { socket: client.id }
      })

      console.log(`Client connected: ${decoded.username}`);
      client.emit('connected', { message: 'Welcome to Transcendence!' });
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
        console.log('juicer not found');
        return;
      }
      
      //todo: maybe move to seperate findUserFromSocketIdToday
      // Find the user by ID and clear the socket ID field
      this.prisma.user.update({
        where: { id: user.id },
        data: { socket: null },
      });
      this.socketManager.removeUserSocket(user.id);
      console.log(`SOCKET DISCONNECTED: ${client.id}`);
    } catch (error) {
      console.log('Error handling disconnect:', error);
    }
  }

  // Method to send messages or data to a specific user using the socket object
  async sendMessageToUser(userId: number, event: string, data: any) {
    const socket = this.socketManager.getUserSocket(userId);

    if (socket) {
      socket.emit(event, data);
    }
  }
}
