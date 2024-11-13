import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, forwardRef, UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { AuthGuard } from '../auth/auth.guard';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard)
@Injectable()
export class UserGateway {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}
  
  afterInit(server: Server) {
  }

  async handleConnection(client: Socket) {
  }


  async handleDisconnect(client: Socket) {
  }

  async emitToSocketByUserId(userId: number, event: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // include: { channels: true},
    });
    const userSocket = this.server.sockets.sockets.get(user.socket);
    if (userSocket) {
      // console.log (`emitting to ${user.username}: ${event}: ${data}`);
      userSocket.emit(event, data);
    }
  }

  async emitUserStatusUpdate(userId: number, data: any) {
    data.id = userId;
    data.userId = userId;
    this.server.emit('userStatusUpdate', data);
  }
}