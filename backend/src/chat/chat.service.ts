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
    console.log(` making channel with user: ${username}`)
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

    if (channel.users.includes(username))
    {
      console.log("already in channel");
      return;
    }

    const updatedUsers = [...channel.users, username];

    // Step 3: Update the channel with the new user list
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
    // Find the channel by its name
    const channel = await this.prisma.channel.findUnique({
      where: { name: channelName },
    });
  
    if (!channel) {
      console.log('No channel found to leave.');
      return;
    }
  
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

  // async storeMessage(sender: string, recipient: string, content: string) {
  //   // Assuming you're storing messages as an array of strings in the Channel model
  //   const channel = await this.prisma.channel.findFirst({
  //     where: {
  //       users: { hasEvery: [sender, recipient] },
  //     },
  //   });

  //   if (channel) {
  //     await this.prisma.channel.update({
  //       where: { id: channel.id },
  //       data: {
  //         messages: { set: [...channel.messages, `${senderId}:${content}`] }, // Use `set` to append messages
  //       },
  //     });
  //   }
  // }

//   async sendMessage(senderId: number, channelId: number, message: string) {
//     const channel = this.getChannelById(channelId);
//     if (!channel)
//         console.log('no channel found');
//     for (const userId of (await channel).users) {
//         const user = this.userService.getUserById(userId)
//         if ((await user).id != senderId)
//             user.socket.emit('recieveMessage', message);
//     }
//   }
}
