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
import { channel } from 'process';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard)
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private channels: Map<number, { users: number[]; channelId: number }> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    // Fetch the user by their socket ID
    const user = await this.prisma.user.findFirst({
      where: { socket: client.id },
    });

    if (!user) {
      console.log('User not found for the disconnect event');
      return;
    }

    // Find all channels the user is in
    const channels = await this.prisma.channel.findMany({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
      include: { users: true }, // Include users to update
    });

    // Loop through each channel the user is in and remove them from the channel
    for (const channel of channels) {
      console.log(`${client.id} disconnected from channel: ${channel.name}`);
      await this.prisma.channel.update({
        where: { id: channel.id },
        data: {
          users: {
            disconnect: { id: user.id }, // Remove user from channel
          },
        },
      });
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { senderId: number; channelName: string; message: string }) {
    console.log(`channelName: ${payload.channelName}\n message: ${payload.message}`);
    const channel = await this.chatService.getChannelByName(payload.channelName);

    if (!channel) {
      console.log('Channel does not exist');
      return null;
    }

    const sender = await this.userService.getUserById(payload.senderId);
    if (!sender) {
      console.log('Sender not found');
      return;
    }

    console.log(`Got message: ${payload.message} from user ${sender.username}`);

    // Broadcast message to all users in the channel
    for (const user of channel.users) {
      if (user.username === 'admin') continue;

      const recipient = await this.userService.getUserById(user.id);
      if (!recipient) {
        console.error(`User ${user.username} not found`);
        continue;
      }

      const userSocket = this.server.sockets.sockets.get(recipient.socket);
      if (!userSocket || userSocket === client) continue;

      console.log(`Sending message to: ${recipient.username} in channel: ${channel.name}`);
      userSocket.emit('recieveMessage', {
        message: payload.message,
        sender: sender.username,
        channel: channel.name,
      });
    }
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, payload: { channel: string; username: string; password: string }) {
    const result = await this.chatService.joinChannel(payload.channel, payload.username, payload.password);
    if (result.success) {
      const user = await this.userService.getUserByUsernameOrEmail(payload.username);
      if (user) {
        // Associate the user's socket with their ID in the database
        await this.prisma.user.update({
          where: { id: user.id },
          data: { socket: client.id },
        });
      }
    }
    return result;
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(client: Socket, payload: { channel: string; username: string }) {
    const result = await this.chatService.leaveChannel(payload.channel, payload.username);
    if (result.success) {
      console.log(`${payload.username} left channel: ${payload.channel}`);
    }
    return result;
  }
}
