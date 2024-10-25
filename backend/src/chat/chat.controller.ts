import { Controller, Put, Body, Param, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChannelRole } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // @Get('all')
  // getAllChannels() {
  //   return this.chatService.getAllChannels();
  // }

  //todo: decide how front end handles joining channels
  // @Get('allUsers')
  // getAllUsers(channelName : string) {
  //   console.log(`fetching users in ${channelName}`);
  //   return this.chatService.getAllUsers(channelName);
  // }

  @Put('channels/:channelName/users/:userId/role')
  async updateUserRole(
    @Param('channelName') channelName: string,
    @Param('userId') userId: number,
    @Body('newRole') newRole: ChannelRole,
  ) {
    try {
      const updatedUserChannel = await this.chatService.updateUserRole(channelName, userId, newRole);
      return {
        message: `User ${userId}'s role in channel "${channelName}" updated to ${newRole}`,
        data: updatedUserChannel,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('Join')
  joinChannel(channelName: string, username: string, password: string, privacy: boolean) {
	console.log (`${username} is joining ${channelName}`);
    return this.chatService.joinChannel(channelName, username, password);
  }

  @Get('leave')
  leaveChannel(channelName: string, username: string) {
	console.log (`${username} is leaving ${channelName}`);
    return this.chatService.leaveChannel(channelName, username);
  }
}