import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Channel } from '@prisma/client';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly userService: UserService
  ) {}

  // Called when the module is initialized to ensure a General channel exists
  async onModuleInit() {
    await this.createGeneralChannel();
  }

  // Create the General channel if it doesn't exist
  async createGeneralChannel() {
    const generalChannel = await this.getChannelByName('General');
    if (!generalChannel) {
      await this.prisma.channel.create({
        data: {
          name: 'General',
          private: false,
          password: null,
        },
      });
      return { success: true, message: 'General Channel created' };
    }
    return { success: false, message: 'General Channel already exists' };
  }

  // Get a channel by its ID with users
  async getChannelById(channelId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { users: true },
    });

    if (!channel) {
      console.log('Channel does not exist');
      return null;
    }

    return channel;
  }

  // Get a channel by its name with users
  async getChannelByName(channelName: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { name: channelName },
      include: { users: true },
    });

    if (!channel) {
      console.log('Channel does not exist');
      return null;
    }

    return channel;
  }

  // Create a new channel and add the user to it
  async createChannel(channelName: string, username: string, password: string) {
    const user = await this.userService.getUserByUsernameOrEmail(username);

    if (!user || !channelName) {
      console.log('No username or channel name provided');
      return { success: false, message: 'Invalid username or channel name' };
    }

    const newChannel = await this.prisma.channel.create({
      data: {
        name: channelName,
        private: password ? true : false,
        password: password || null,
        users: {
          connect: { id: user.id },
        },
      },
    });

    return { success: true, message: `Channel ${channelName} created and ${username} joined` };
  }

  // Join an existing channel or create a new one if it doesn't exist
  async joinChannel(channelName: string, username: string, password: string) {
    const user = await this.userService.getUserByUsernameOrEmail(username);

    if (!user) {
      return { success: false, message: 'Invalid username' };
    }

    let channel = await this.getChannelByName(channelName);

    // If channel doesn't exist, create it
    if (!channel) {
      return await this.createChannel(channelName, username, password);
    }

    // Check if the channel is private and if the password matches
    if (channel.private && password !== channel.password) {
      console.log('Incorrect password');
      return { success: false, message: 'Incorrect password', passwordRequired: true };
    }

    // Check if the user is already in the channel
    if (channel.users.some(u => u.id === user.id)) {
      console.log('User is already in the channel');
      return { success: false, message: 'Already in the channel' };
    }

    // Add the user to the channel
    await this.prisma.channel.update({
      where: { name: channelName },
      data: {
        users: {
          connect: { id: user.id },
        },
      },
    });

    return { success: true, message: `User ${username} joined ${channelName}` };
  }

  // Leave a channel
  async leaveChannel(channelName: string, username: string) {
    const user = await this.userService.getUserByUsernameOrEmail(username);
    const channel = await this.getChannelByName(channelName);

    if (!channel || !user) {
      console.log('No channel or user found to leave');
      return { success: false, message: 'Channel or user not found' };
    }

    // Check if the user is in the channel
    if (!channel.users.some(u => u.id === user.id)) {
      console.log('User is not in the channel');
      return { success: false, message: 'User not in the channel' };
    }

    // Remove the user from the channel
    await this.prisma.channel.update({
      where: { name: channelName },
      data: {
        users: {
          disconnect: { id: user.id },
        },
      },
    });

    // Check if the channel has no more users and delete it if empty
    const updatedChannel = await this.getChannelByName(channelName);
    if (updatedChannel?.users.length === 0) {
      await this.prisma.channel.delete({
        where: { name: channelName },
      });
      console.log(`Deleted empty channel: ${channelName}`);
    }

    return { success: true, message: `User ${username} left ${channelName}` };
  }

  // Get all users in a channel
  async getAllUsers(channelName: string) {
    console.log('getAllUsers called');
    const channel  = await this.getChannelWithUsers(channelName);

    if (!channel) {
      return { success: false, message: 'Channel does not exist' };
    }

    const formattedUsers = channel.users.map(user => ({
      username: user.username,
      isOnline: user.isOnline,
    }));

    return { success: true, users: formattedUsers };
  }

  // Get all channels with user counts
  async getAllChannels() {
    const channels = await this.prisma.channel.findMany({
      select: {
        name: true,
        private: true,
        users: true,
      },
    });

    if (!channels.length) {
      console.log('No channels found');
      return [];
    }

    return channels.map(channel => ({
      name: channel.name,
      private: channel.private,
      userCount: channel.users.length,
    }));
  }

  // Helper function to get a channel with its users
  async getChannelWithUsers(channelName: string){
    const channel = await this.prisma.channel.findUnique({
      where: { name: channelName },
      include: { users: true },
    });

    if (!channel) {
      console.log('Channel does not exist');
      return null;
    }

    return channel;
  }
}
