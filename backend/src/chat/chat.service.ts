import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Channel } from '@prisma/client';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly userService: UserService) {}

  // async getUserSocketById(userId: number): Promise<string | null> {
  //   const user = await this.prisma.user.findUnique({
  //     where: { id: userId },
  //     select: { socket: true },
  //   });

  //   return user ? user.socket : null;
  // }

  async onModuleInit() {
    await this.createGeneralChannel();
  }

  async createGeneralChannel() {
    const generalChannel = await this.getChannelByName('General');
    if (!generalChannel) {
      await this.createChannel('General', 'admin'); // "admin" or any default username
      console.log('General channel created');
    }
  }


  async getChannelById(channelId: number): Promise<Channel | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    })
    if (!channel) {
      console.log('Channel doesnt exist');
      return;
    }

    return channel;
  }

  async getChannelByName(channelname: string): Promise<Channel | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { name: channelname },
    })
    if (!channel) {
      console.log('Channel doesnt exist');
      return;
    }

    return channel;
  }

  async createChannel(channelName: string, username: string) {
    if (!username || !channelName) {
      console.log("no username or no channel name  to create channel");
      return;
    }
    console.log(` making channel ${channelName} with user: ${username}`)
    const newChannel = await this.prisma.channel.create({
      data: {
        name: channelName,
        private: false,
        users: [username], 
        messages: [], 
      },
    });
  
    return newChannel;
  }

  async joinChannel(channelName: string, username: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { name: channelName }
    })
    if (!channel)
      return await this.createChannel(channelName, username);

    if(!username)
    {
      console.log(`${username} is invalid`);
      
    }

    if (channel.users.includes(username))
    {
      console.log("already in channel");
      return;
    }


    const updatedUsers = [...channel.users, username];

    await this.prisma.channel.update({
      where: { name: channelName },
      data: {
        users: updatedUsers,
      },
    });
    const newchannel = await this.prisma.channel.findUnique({
      where: { name: channelName }
    })

    console.log (`JUICER: ${username} ADDED!`);
    console.log (`users in ${newchannel.name} : ${newchannel.users}`);
    return;
  }

  async leaveChannel(channelName: string, username: string) {
    let channel = await this.prisma.channel.findUnique({
      where: { name: channelName },
    });
  
    if (!channel) {
      console.log('No channel found to leave.');
      return;
    }
    console.log (`finding user: ${username} in channel ${channelName}`)
    if (!channel.users.includes(username)) {
      console.log("User is not in the channel.");
      return;
    }
  
    const updatedUsers = channel.users.filter(user => user !== username);
    await this.prisma.channel.update({
      where: { name: channelName },
      data: {
        users: updatedUsers,
      },
    });

    channel = await this.prisma.channel.findUnique({
      where: { name: channelName },
    });
    if (channel.users.length <= 0) {
      console.log(`No members in channel ${channelName}, deleting channel`);
      await this.prisma.channel.delete({
        where: { name: channelName}
      })
    }
    console.log(`${username} has left the channel: ${channelName}`);
  }
  
  async getAllChannels() {
    const channels = await this.prisma.channel.findMany({
      select: {
        name: true,
        private: true,
        users: true,
      },
    });
  
    if (!channels) {
      console.log("No channels");
      return [];
    }
  
    // Map the result to include userCount and remove the users array
    const channelsWithUserCount = channels.map(channel => ({
      name: channel.name,
      private: channel.private,
      userCount: channel.users.length, // Calculate user count
    }));
  
    return channelsWithUserCount;
  }
}