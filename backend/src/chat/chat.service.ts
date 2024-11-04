import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Channel, ChannelRole } from '@prisma/client';
import { UserService } from 'src/user/user.service';
import { Prisma } from '@prisma/client'; // Importing Prisma to access the ChannelRole enum
import { channel } from 'diagnostics_channel';

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
      console.log("creating general");
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
    
    if (!channelName)
    {
      console.log('Channelname does not exist');
      return null;
    }

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

  async getUserChannel(channelID: number, userID: number) {
    const userChannel = await this.prisma.userChannel.findFirst({
      where: {
        userId: userID,
        channelId: channelID,
      },
    });

    if (!userChannel) {
      console.log(`UserChannel does not exist`);
      return { success: false, message: "UserChannel not found" };
    }
  
    return { userChannel, success: true, message: "Returning UserChannel" };
  }

  async createChannel(channelName: string, userId: number, password: string) {
    const user = await this.userService.getUserById(userId);
    console.log(`${user.username} creating ${channelName}`);
    if (!user || !channelName) {
      console.log('No username or channel name provided');
      return { success: false, message: 'Invalid username or channel name' };
    }
  
    // Create the channel itself
    const newChannel = await this.prisma.channel.create({
      data: {
        name: channelName,
        private: !!password,
        password: password || null,
      },
    });
  
    // Add the creating user to the channel with an admin role
    await this.createUserChannel(user.id, newChannel.id, ChannelRole.ADMIN);
  
    return { success: true, message: `Channel ${channelName} created and ${user.username} joined` };
  }
  
  // Method to add a user to a channel with a specified role
  async createUserChannel(userId: number, channelId: number, role: ChannelRole) {
  console.log(`creating userchannel entry for user ${userId}, at channelid ${channelId} and role ${role}`);

    await this.prisma.userChannel.create({
      data: {
        userId,
        channelId,
        role,
      },
    });
    console.log(`User ${userId} added to channel ${channelId} with role ${role}`);
  }

  async isPriviledged(channelId: number, userId: number) {
    const channel = await this.getChannelById(channelId);
    if (!channel) {
      console.log('user isnt even in channel, let alone priviledged');
      return false;
    }

    const userInChannel = await this.getUserChannel(channelId, userId);
    if (!userInChannel || (userInChannel.userChannel.role != 'ADMIN' && userInChannel.userChannel.role != 'OWNER')) {
      console.log('user is NOT priviledged')
      return false;
    }

    return true;
  }

  async isOwner(channelId: number, userId: number) {
    const channel = await this.getChannelById(channelId);
    if (!channel) {
      console.log('user isnt even in channel, let alone owner');
      return false;
    }

    const userInChannel = await this.getUserChannel(channelId, userId);
    if (!userInChannel || userInChannel.userChannel.role != 'OWNER') {
      console.log('user is NOT priviledged')
      return false;
    }

    return true;
  }

  // Join an existing channel or create a new one if it doesn't exist
  async joinChannel(channelName: string, userId: number, password: string) {
    const user = await this.userService.getUserById(userId);

    if (!user) {
      return { success: false, message: 'Invalid userId' };
    }

    let channel = await this.getChannelByName(channelName);

    // If channel doesn't exist, create it
    if (!channel) {
      return await this.createChannel(channelName, userId, password);
    }

    if (password !== channel.password) {
      console.log('Incorrect password');
      return { success: false, message: 'please input password', passwordRequired: true };
    }

    // Check if the user is already in the channel
    if (channel.users.some(u => u.id === user.id)) {
      console.log('User is already in the channel');
      return { success: false, message: 'Already in the channel' };
    }
    
    const userInChannel = await this.prisma.userChannel.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: channel.id,
        },
      },
    });

    if (userInChannel) {
      console.log(`User is already in the channel, test: ${userInChannel.role}`);
      return { success: false, message: 'Already in the channel' };
    }

    // Add the user to the channel
    await this.prisma.userChannel.create({
      data: {
        userId: user.id,
        channelId: channel.id,
        role: 'MEMBER', 
      },
    });
    return { success: true, message: `User ${user.username} joined ${channelName}` };
  }

  // Leave a channel
  async leaveChannel(channelName: string, userId: number) {
    console.log(`userId is  ${userId} in chat service for leaving`);
    const user = await this.userService.getUserById(userId);
    const channel = await this.getChannelByName(channelName);


    if (!channel || !user) {
      console.log('No channel or user found to leave');
      return { success: false, message: 'Channel or user not found' };
    }

    const userchannel = await this.getUserChannel(channel.id,  userId);
    
    if (!userchannel.userChannel) {
      return { success: false, message: "userchannel entry does not exist" };
    }

    await this.prisma.userChannel.delete({
      where: { userId_channelId: { userId: user.id, channelId: channel.id } },
    });

    // Check if the channel has no more users and delete it if empty
    const remainingUsers = await this.prisma.userChannel.findMany({
      where: { channelId: channel.id },
    });
  
    if (remainingUsers.length === 0) {
      await this.prisma.channel.delete({
        where: { id: channel.id },
      });

      return { success: true, message: `User ${user.username} left and channel ${channelName} was deleted because it was empty` };
    }
    return { success: true, message: `User ${user.username} left ${channelName}` };
  }

  async submitPassword(channelName: string, password: string)
  {
    const channel = await this.getChannelByName(channelName);

    if (password != channel.password) {
      return { success: false, message: "invalid password, please try again"};
    }

    return { success: true};
  }

  async setChannelPassword(channelName: string, password: string)
  {
    const channel = this.getChannelByName(channelName);

    if(!channel) {
      console.log("channel does not exist");
      return null;
    }

    await this.prisma.channel.update({
      
      where : { name: channelName},
      data : { password: password},
    });

    return{ success: true, message: `password succesfully set to ${password}`};
  }
  // Get all users in a channel
  async getAllUsers(channelName: string) {
    console.log('getAllUsers called');
    const channel  = await this.getChannelWithUsers(channelName);

    if (!channel) {
      return { success: false, message: 'Channel does not exist' };
    }

    const users = await this.prisma.userChannel.findMany({
      where: { channelId: channel.id },
      include: { user: true },
    });
  
    const formattedUsers = users.map(uc => ({
      username: uc.user.username,
      isOnline: uc.user.isOnline,
      role: uc.role, // Include user role in the response
    }));
  
    return { success: true, users: formattedUsers };
  }

  // Get all channels with user counts
  async getAllChannels() {
    const channels = await this.prisma.channel.findMany({
      include: {
        userChannels: true, // Fetch userChannels to count users
      },
    });
  
    if (!channels.length) {
      return [];
    }
  
    return channels.map(channel => ({
      name: channel.name,
      private: channel.private,
      userCount: channel.userChannels.length, // Use the length of userChannels to count users
    }));
  }

  // Helper function to get a channel with its users
  // Helper function to get a channel with its users
  async getChannelWithUsers(channelName: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { name: channelName },
      include: {
        userChannels: {
          include: { user: true },
        },
      },
    });

    if (!channel) {
      return null;
    }

    return channel;
  }


  async updateUserRole(channelName: string, userId: number, newRole: ChannelRole) {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: { name: channelName },
      });
  
      if (!channel) {
        throw new Error(`Channel "${channelName}" does not exist`);
      }
  
      const userChannel = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: {
            userId: userId,
            channelId: channel.id,
          },
        },
      });
  
      if (!userChannel) {
        throw new Error(`User with ID ${userId} is not a member of the channel "${channelName}"`);
      }
  
      const updatedUserChannel = await this.prisma.userChannel.update({
        where: {
          userId_channelId: {
            userId: userId,
            channelId: channel.id,
          },
        },
        data: {
          role: newRole, // Use the newRole as ChannelRole
        },
      });
      console.log(`returning ${updatedUserChannel.role}`)
      return updatedUserChannel;
    } catch (error) {
      console.error('Failed to update user role:', error.message);
      throw new Error(`Failed to update role for user ${userId} in channel "${channelName}"`);
    }
  }
}
