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
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
  
  
  interface channel {
    users: number[];
    channelId: number;
  }
  
  @WebSocketGateway({ cors: true })
  @UseGuards(AuthGuard)
  @Injectable()
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
    const user = await this.prisma.user.findFirst({
      where: { socket: client.id},
    });
    if (!user) {
      console.log('juicer not found');
      return;
    }
    const channels = await this.prisma.channel.findMany({
      where: {
        users: {
          has: user.username
        }
      }
    })

    for (const channel of channels) {
      console.log(`${client.id} disconnected from channel: ${channel.name}`);
      await this.prisma.channel.update({
        where: { id: channel.id },
        data: {
          users: {
            set: channel.users.filter((username) => username !== user.username) // Remove the deleted user's ID from all channels
          }
        }
      })
    } 
   
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
    console.log(`got message: ${payload.message} from userid ${sender.username}`);
    for (const username of channel.users) {
      if (username == 'admin')
         continue;
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
  @SubscribeMessage('leaveChannel')
	async handleLeavehannel(client: Socket, payload: { channel: string, username: string }) {
	  return this.chatService.leaveChannel(payload.channel, payload.username);
	}
}