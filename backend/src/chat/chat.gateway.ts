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
import { ChannelRole } from '@prisma/client';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard)
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const user = await this.prisma.user.findFirst({
      where: { socket: client.id },
    });

    if (!user) {
      console.log('User not found for disconnect event');
      return;
    }

    const userChannels = await this.prisma.userChannel.findMany({
      where: { userId: user.id },
      include: { channel: true },
    });

    for (const userChannel of userChannels) {
      console.log(`Client ${client.id} disconnected from channel: ${userChannel.channel.name}`);
      await this.prisma.userChannel.delete({
        where: {
          userId_channelId: { userId: user.id, channelId: userChannel.channelId },
        },
      });
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { senderId: number; channelName: string; message: string }) {
    console.log(`channelName: ${payload.channelName} message: ${payload.message}`);

    const channel = await this.prisma.channel.findFirst({
      where: { name: payload.channelName },
      include: { userChannels: { include: { user: true } } },
    });

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

    this.server.to(channel.name).emit('receiveMessage', {
      message: payload.message,
      sender: sender.username,
      channel: payload.channelName,
    });
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, payload: { channelName: string; username: string; password: string }) {
    console.log(`trying to join ${payload.channelName} [Gateway]`);
    const channelExists = await this.chatService.getChannelByName(payload.channelName);
    const result = await this.chatService.joinChannel(payload.channelName, payload.username, payload.password);

    if (result.success) {
      const user = await this.userService.getUserByUsername(payload.username);

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { socket: client.id },
        });

        if (!channelExists) {
          console.log(" emitting role event to front end")
          await this.chatService.updateUserRole(payload.channelName, user.id, ChannelRole.ADMIN);
          this.server.to(payload.channelName).emit('userRoleUpdated', {
            username: user.username,
            newRole: "ADMIN",
            message: "Assigned as admin on channel creation",
          });


          console.log(`${user.username} is now Admin of ${payload.channelName}`)
        }

      client.join(payload.channelName);
      console.log(`${payload.username} joined channel: ${payload.channelName}`);

        await this.updateUserList(payload.channelName);
      }
    }

    return result;
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(client: Socket, payload: { channelName: string; username: string }) {
    const result = await this.chatService.leaveChannel(payload.channelName, payload.username);

    if (result.success) {
      console.log(`${payload.username} left channel: ${payload.channelName}`);
      client.leave(payload.channelName);
      await this.updateUserList(payload.channelName);
    }

    return result;
  }

  @SubscribeMessage('updateUserRole')
  async handleUpdateUserRole(client: Socket, payload: { channelName: string; username: string; newRole: string }) {
    console.log(`Updating role for ${payload.username} in channel: ${payload.channelName} to ${payload.newRole}`);

    const channel = await this.prisma.channel.findFirst({
      where: { name: payload.channelName },
      include: { userChannels: { include: { user: true } } },
    });

    if (!channel) {
      console.log('Channel does not exist');
      return;
    }

    const user = await this.userService.getUserByUsername(payload.username);
    if (!user) {
      console.log('User not found');
      return;
    }

    if (!(payload.newRole in ChannelRole)) {
      console.error(`Invalid role: ${payload.newRole}`);
      return client.emit('error', 'Invalid role');
    }
    
    const newRoleEnumValue = ChannelRole[payload.newRole as keyof typeof ChannelRole];
    // Update the user's role in the specified channel
    await this.prisma.userChannel.update({
      where: {
        userId_channelId: { userId: user.id, channelId: channel.id },
      },
      data: {
        role: newRoleEnumValue, // Assuming role is a string, possibly enum value
      },
    });

    console.log(`Updated role for ${user.username} to ${payload.newRole} in channel: ${payload.channelName}`);

    // Notify users in the channel about the role update
    this.server.to(payload.channelName).emit('userRoleUpdated', {
      username: user.username,
      newRole: payload.newRole,
    });

    await this.updateUserList(payload.channelName);
  }

  async updateUserList(channelName: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { name: channelName },
      include: { userChannels: { include: { user: true } } },
    });

    if (!channel) {
      console.log('Channel does not exist');
      return;
    }

    const usersInChannel = channel.userChannels.map(userChannel => ({
      id: userChannel.user.id,
      username: userChannel.user.username,
      isOnline: userChannel.user.isOnline,
      role: userChannel.role, 
    }));

    this.server.to(channel.name).emit('updateUserList', usersInChannel);
    console.log(`Updated user list in channel ${channelName}`);
  }

  @SubscribeMessage('getUserList')
  async handleGetUserList(client: Socket, payload: { channel: string }) {
    const channel = await this.chatService.getChannelByName(payload.channel);

    if (!channel) {
      console.error('Channel not found:', payload.channel);
      return client.emit('userListError', 'Channel not found');
    }

    const usersInChannel = await this.prisma.userChannel.findMany({
      where: { channelId: channel.id },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, isOnline: true },
        },
      },
    });

    const userList = usersInChannel.map(uc => ({
      id: uc.user.id,
      username: uc.user.username,
      avatar: uc.user.avatar,
      isOnline: uc.user.isOnline,
      role: uc.role, // Include role in the user list
    }));

    client.emit('updateUserList', userList);
  }
}
