import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SocketManagerService } from 'src/socket-manager/socket-manager.service';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';


interface channel {
  users: number[];
  channelId: number;
}

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  // private channelMembers: number[];
  private channels: Map<number, channel> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly socketService: SocketManagerService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    // Handle a new client connection, e.g., authenticate user, update status, etc.
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    // Handle client disconnect, e.g., update status in the database
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { senderId: number; channelId: number; message: string }) {
    const channel = await this.chatService.getChannelById(payload.channelId);
    console.log(`channelId: ${payload.channelId}`);
    if (!channel) {
      console.log('no channel found');
      return;
    }
    console.log(`got message: ${payload.message}`);
    for (const userId of channel.users) {
        const userSocket = this.socketService.getUserSocket(userId);
        // if (userSocket != client)

            userSocket.emit('recieveMessage', { message: payload.message, sender: 'joe' } ); //todo: get sender username
    }
    // this.server.to(recipientSocketId).emit('receiveMessage', {
    //   senderId: payload.senderId,
    //   content: payload.content,
    // });
    // Optionally, store the message in the database or perform other actions
    // await this.chatService.storeMessage(payload.senderId, payload.recipientId, payload.content);
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, payload: { channel: number, userId: number }) {
    const user = await this.userService.getUserById(payload.userId);
    // this.channels[payload.channel].users.push(payload.userId);
    const channel = await this.chatService.getChannelById(payload.channel);

    //check if user is already in the channel they are trying to join
    if (channel.users.includes(payload.userId)) {
      console.log ("juicer already in channel");
      return;
    } // add the user to the channel

    this.prisma.channel.update({
      where: { id: channel.id },
      data: {
        users: {
          push: payload.userId,
        },
      },
    })
    console.log (`JUICER: ${user.username} ADDED!`);

  }
}
