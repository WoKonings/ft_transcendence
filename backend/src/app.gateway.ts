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
      const token = client.handshake.query.token as string;
      const decoded = this.jwtService.verify(token);

      // Store the socket ID in the user record
      await this.prisma.user.update({
        where: { id: decoded.sub },
        data: { socket: client.id },
      });

      console.log(`Client connected: ${decoded.username}`);
      client.emit('connected', { message: 'Welcome to Transcendence!' });
    } catch (error) {
      console.log('Invalid token, disconnecting client');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      // Find the user by socket ID and clear the socket ID field
      await this.prisma.user.updateMany({
        where: { socket: client.id },
        data: { socket: null },
      });

      console.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      console.log('Error handling disconnect:', error);
    }
  }

  // Method to send messages or data to a specific user using socket ID
  async sendMessageToUser(userId: string, event: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { socket: true },
    });

    if (user && user.socket) {
      this.server.to(user.socket).emit(event, data);
    }
  }
}
