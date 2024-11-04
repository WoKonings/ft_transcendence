import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';
import { Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PayloadSizeGuard } from '../auth/payload-size.guard';
import { ChannelRole } from '@prisma/client';
import { channel, subscribe } from 'diagnostics_channel';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
@UseGuards(AuthGuard, PayloadSizeGuard)
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    let decoded;
    try {
      const token = client.handshake.auth.token as string;
      decoded = this.jwtService.verify(token);
      if (!decoded) {
        return;
      }
    } catch {
      console.log('Invalid token in gateway');
      return;
    }

    const channels = await this.chatService.getAllUserChannels(decoded.id);
    const channelList = channels.channels;

    for (let i = 0; i < channelList.length; i++) {
      const channelName = channelList[i].name;
      client.join(channelName);
      console.log(`${decoded.username} re-joined room: ${channelName}`);
    }

    client.emit('receiveChatList', { channels });
  }

  async handleDisconnect(client: Socket) {
    // client.disconnect(); //todo:?
  }

  @SubscribeMessage('getChannels')
  async getChannels(client: Socket) {
    const userId = client['user']?.id;
    const channels = await this.chatService.getAllUserChannels(userId);

    client.emit('receiveChatList', { channels });
  }

  @SubscribeMessage('setChannelPassword')
  async setChannelPassword(client: Socket, payload: { channelName: string, password: string}) {
    const channel = await this.chatService.getChannelByName(payload.channelName);
    if (!channel) {
      console.log("channel does not exist");
      return;
    }

    const callerId = client['user']?.id
    if (!await this.chatService.isOwner(channel.id, callerId)) {
      console.log(`Need owner to set password`);
      return null;
    }

    return this.chatService.setChannelPassword(payload.channelName, payload.password);
  }

  @SubscribeMessage('setChannelPrivacy')
  async setChannelPrivacy(client: Socket, payload: { channelName: string }) {
    console.log(`trying to change privacy for ${payload.channelName}`);

    const channel = await this.chatService.getChannelByName(payload.channelName);
    if (!channel) {
      console.log("channel does not exist");
      return;
    }

    const callerId = client['user']?.id
    if (!await this.chatService.isOwner(channel.id, callerId)) {
      console.log(`Need owner to set privacy`);
      return null;
    }

    const privacy = await this.chatService.setChannelPrivacy(payload.channelName);

    this.server.to(channel.name).emit('channelPrivacy', {
      isPrivate: privacy,
      channel: payload.channelName,
    });
    return;
  }
  
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { channelName: string; message: string }) {
    console.log(`channelName: ${payload.channelName} message: ${payload.message}`);
    const senderId = client['user']?.id;
    const channel = await this.prisma.channel.findFirst({
      where: { name: payload.channelName },
      include: { userChannels: { include: { user: true } } },
    });

    if (!channel) {
      console.log('Channel does not exist');
      return null;
    }

    const sender = await this.userService.getUserById(senderId);
    if (!sender) {
      console.log('Sender not found');
      return;
    }

    const userChannel = await this.chatService.getUserChannel(channel.id, sender.id);
    if (!userChannel) {
      console.log('User is not in channel')
      return;
    }

    if (userChannel?.userChannel.timeout > new Date()) {
      console.log('User is currently timed out')
      client.emit('userTimeout', {userId: senderId, channelName: channel.name, timeoutEnd: userChannel?.userChannel.timeout});
      return;
    }
    console.log(`Got message: ${payload.message} from user ${sender.username}`);

    this.server.to(channel.name).emit('receiveMessage', {
      message: payload.message,
      sender: sender.username,
      userId: sender.id,
      channel: payload.channelName,
    });
  }

  @SubscribeMessage('submitPassword')
  async submitPassword(client: Socket, payload: {channelName: string, password: string}) {
    const channel = await this.chatService.getChannelByName(payload.channelName);

    if(!channel) {
      console.log("channel does not exist for submitting password");
      return null;
    }

    // const callerId = client['user']?.id
    // if (!await this.chatService.isOwner(channel.id, callerId)) {
    //   console.log(`Need owner to set password`);
    //   return null;
    // }

    const response =  await this.chatService.submitPassword(channel.name, payload.password);

    if (response.success == true) {
      return await this.handleJoinChannel(client, {channelName: channel.name, password: payload.password})
    }
    else if (response.success == false)
      return(response);
  }

  @SubscribeMessage('kickUser')
  async handleKickUser(client: Socket, payload: { channelName: string, targetId: number }) {
    console.log(`KICK: ${payload.channelName}, ${payload.targetId}`)
    const channel = await this.chatService.getChannelByName(payload.channelName);
    const target = await this.userService.getUserById(payload.targetId);
    const callerId = client['user']?.id
    if (!channel) {
      console.error("channel does not exist in kicking");
      return null;
    }
    if(!target) {
      console.log(`target ${target.username} does not exist`);
      return null;
    }
    if (!await this.chatService.isPriviledged(channel.id, callerId)) {
      console.log(`Need admin to kick`);
      return null;
    }
    if (await this.chatService.isOwner(channel.id, target.id)) {
      console.log(`Cannot kick owner`);
      return null;
    }

    const response = await this.chatService.leaveChannel(channel.name, payload.targetId);

    console.log(`kicking ${target.username} from ${channel.name}`)

    if (response.success === true) {
        this.server.to(channel.name).emit('userKicked', { targetId: target.id, channelName: channel.name });
    }
  }

  @SubscribeMessage('banUser')
  async handleBanUser(client: Socket, payload: { channelName: string, targetId: number }) {
    const channel = await this.chatService.getChannelByName(payload.channelName);
    if (!channel) {
      console.error("channel does not exist in kicking");
      return null;
    }

    const callerId = client['user']?.id
    if (!await this.chatService.isPriviledged(channel.id, callerId)) {
      console.log(`Need admin to ban`);
      return null;
    }

    if (await this.chatService.isOwner(channel.id, payload.targetId)) {
      console.log(`Cannot ban owner`);
      return null;
    }

    this.handleKickUser(client, payload);
    console.log('Updating channel with banned targetId:', payload.targetId);

    await this.prisma.channel.update({
      where: { name: payload.channelName },
      data: {
        banned: {
          push: payload.targetId,
        },
      },
    });
  
    console.log(`target with ID ${payload.targetId} has been banned from channel ${payload.channelName}`);
  }

  //todo: check for admin
  @SubscribeMessage('timeoutUser')
  async handleTimeoutUser(client: Socket, payload: { channelName: string, targetId: number }) {
    console.log(`TIMEOUT: ${payload.channelName}, ${payload.targetId}`)

    const channel = await this.chatService.getChannelByName(payload.channelName);
    const target = await this.userService.getUserById(payload.targetId);
    const userId = client['user']?.id;
    if (!channel) {
      console.error("channel does not exist in timeout");
      return;
    }
    if (!target) {
      console.log(`user ${target.username} does not exist`);
      return;
    }
    const targetUserChannel = await this.chatService.getUserChannel(channel.id, target.id);
    if (!targetUserChannel || targetUserChannel.userChannel.role == 'OWNER') {
      console.log(`cannot timeout ${target.username}`);
      return;
    }
    if (!await this.chatService.isPriviledged(channel.id, userId)) {
      console.log('unauthorized to timeout');
      return;
    }
    if (await this.chatService.isOwner(channel.id, payload.targetId)) {
      console.log(`Cannot timeout owner`);
      return;
    }

    const timeout = new Date();
    timeout.setSeconds(timeout.getSeconds() + 30);
    await this.prisma.userChannel.update({
      where: { userId_channelId: { userId: target.id, channelId: channel.id } },
      data: { timeout: timeout },
    });

    console.log(`timing out ${target.username} from ${channel.name}`)
    this.server.to(channel.name).emit('userTimeout', { userId: target.id, channelName: channel.name, timeoutEnd: timeout });
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, payload: { channelName: string; password: string }) {
    console.log(`trying to join ${payload.channelName} [Gateway]`);
    const userId = client['user']?.id;
    const channelExists = await this.chatService.getChannelByName(payload.channelName);
    const result = await this.chatService.joinChannel(payload.channelName, userId, payload.password);

    if (result.success) {
      const user = await this.userService.getUserById(userId);

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { socket: client.id },
        });

        if (!channelExists) {
          console.log(" emitting role event to front end");
          await this.chatService.updateUserRole(payload.channelName, user.id, ChannelRole.OWNER);
          this.server.to(payload.channelName).emit('userRoleUpdated', {
            username: user.username,
            newRole: "OWNER",
            message: "Assigned as admin on channel creation",
          });
          console.log(`${user.username} is now Admin of ${payload.channelName}`)
        }
        else {
          console.log("making user default role");
          await this.chatService.updateUserRole(payload.channelName, user.id, ChannelRole.MEMBER);
          this.server.to(payload.channelName).emit('userRoleUpdated', {
            username: user.username,
            newRole: "MEMBER",
            message: "Assigned as MEMBER on channel creation",
          });
        }
        client.join(payload.channelName);
        console.log(`${user.username} joined channel: ${payload.channelName} \n and is now in ${client.rooms}`);
        await this.updateUserList(payload.channelName);
      }
    }
    return result;
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(client: Socket, payload: { channelName: string }) {
    const userId = client['user']?.sub;
    console.log(`leaving ${payload.channelName}`)
    const result = await this.chatService.leaveChannel(payload.channelName, userId);

    if (result.success) {
      console.log(`${userId} left channel: ${payload.channelName}`);
      client.leave(payload.channelName);
      await this.updateUserList(payload.channelName);
    }

    return result;
  }

  @SubscribeMessage('directMessage')
  async handleDirectMessage(client: Socket, payload: { targetId: number, message: string }) {
    const senderId = client['user']?.id;
    const senderName = client['user']?.username;
    console.log(`trying to message ${payload.targetId}`);
    const target = await this.userService.getUserById(payload.targetId);
    if (!target) {
      console.log('target userId for DM does not exist');
      return;
    }
    const data = { userId: senderId, name: senderName, message: payload.message }
    const socket = this.server.sockets.sockets.get(target.socket);
    if (socket) {
      socket.emit('directMessage', data);
    }
    console.log(`direct message from: ${senderName} to: ${target.username}: ${payload.message}`)
    return;
  }

  @SubscribeMessage('updateUserRole')
  async handleUpdateUserRole(client: Socket, payload: { channelName: string, role: string }) {
    const userId = client['user']?.id;
    console.log(`seeking to update user ${userId} in channel: ${payload.channelName} to ${payload.role}`);
    
    const channel = await this.prisma.channel.findFirst({
      where: { name: payload.channelName},
      include: { userChannels: { include: { user: true } } },
    });
    
    if (!channel) {
      console.log('Channel does not exist');
      return;
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      console.log('User not found');
      return;
    }
    
    if (!(payload.role in ChannelRole)) {
      console.error(`Invalid role: ${payload.role}`);
      return client.emit('error', 'Invalid role');
    }

    console.log('Updating role for user:', user.id, 'in channel:', channel.id);
    const userChannelRecord = await this.chatService.getUserChannel(channel.id, user.id);

    console.log('UserChannel Record:', userChannelRecord);

    const newRoleEnumValue = ChannelRole[payload.role as keyof typeof ChannelRole];
    // Update the user's role in the specified channel
    await this.prisma.userChannel.update({
      where: {
        userId_channelId: { userId: user.id, channelId: channel.id },
      },
      data: {
        role: newRoleEnumValue, // Assuming role is a string, possibly enum value
      },
    });

    console.log(`Updated role for ${user.username} to ${payload.role} in channel: ${channel.name}`);

    // Notify users in the channel about the role update
    this.server.to(channel.name).emit('userRoleUpdated', {
      username: user.username,
      newRole: payload.role,
    });

    await this.updateUserList(channel.name);
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

  @SubscribeMessage('getUserRole')
  async getUseRole(payload: {userId: number, channelId: number}) {
    const userRole = this.chatService.getUserChannel(payload.channelId, payload.userId); 

    if (!userRole)
      {
        console.log("userRole dont exist");
        return null;
      }

      return
  } 

  @SubscribeMessage('getUserList')
  async handleGetUserList(client: Socket, payload: { channel: string }) {
    const channel = await this.chatService.getChannelByName(payload.channel);

    if (!channel) {
      console.error('Channel not found: in get userlist', payload.channel);
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

  @SubscribeMessage('getDMUserList')
  async handleGetDMUserList(client: Socket, payload: { userId: number }) {
    const userId = client['user']?.sub;
    const targetUser = await this.prisma.user.findFirst({
      where: { id: payload.userId },
      select: { id: true, username: true, avatar: true, isOnline: true },
    });
  
    if (!targetUser) {
      console.error('User not found:', payload.userId);
    }
  
    const currentUser = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, avatar: true, isOnline: true },
    });

    const userList = [targetUser, currentUser];
    client.emit('updateDMUserList', userList);
  }
}
