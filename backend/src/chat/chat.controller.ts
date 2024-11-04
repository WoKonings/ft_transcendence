import { Controller, Put, Body, Param, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChannelRole } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
}