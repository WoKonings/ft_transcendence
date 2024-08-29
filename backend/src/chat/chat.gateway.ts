import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { ChatService } from './chat.service';
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
	  private readonly userService: UserService,
	  private readonly prisma: PrismaService,
	) {}
  
	async handleConnection(client: Socket) {
	  // Handle a new client connection, e.g., authenticate user, update status, etc.
	  console.log(`Client connected in chat: ${client.id}`);
	}
  
	async handleDisconnect(client: Socket) {
	  // Handle client disconnect, e.g., update status in the database
	  console.log(`Client disconnected: ${client.id}`);
	}
  
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { senderId: number; channel: string; message: string }) {
    const channel = await this.chatService.getChannelByName(payload.channel);
    if (!channel) {
      console.log('no channel found');
      return;
    }
    const sender = await this.userService.getUserById(payload.senderId);
    if (!sender) {
      console.log('Sender not found');
      return;
    }
    console.log(`got message: ${payload.message} from userid ${sender.id}`);
    for (const username of channel.users) {
      const recipient = await this.userService.getUserByUsernameOrEmail(username);
      if (!recipient) {
        console.error(`User ${username} not found when trying to send a message`);
        continue;
      }
      console.log(`found recipient ${username} socket: ${recipient.socket}`);
      const userSocket = this.server.sockets.sockets.get(recipient.socket);
      if (!userSocket) {
        console.log ('failed to get usersocket to message')
        continue;
      }
      console.log(`actually sending message to :${username} in channel: ${channel.name}`);
      console.log(`huh: ${userSocket.id} cli: ${client.id}`);
      if (userSocket && userSocket !== client) {
        console.log('SENDING');
        userSocket.emit('recieveMessage', { 
          message: payload.message, 
          sender: sender.username, 
          channel: channel.name 
        });
      }
    }
  }
  
	@SubscribeMessage('joinChannel')
	async handleJoinChannel(client: Socket, payload: { channel: string, username: string }) {
	  return this.chatService.joinChannel(payload.channel, payload.username);
	}
}