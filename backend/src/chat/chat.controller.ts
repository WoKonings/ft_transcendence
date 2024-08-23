import { Controller, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('all')
  getAllChannels() {
    return this.chatService.getAllChannels();
  }

  //todo: decide how front end handles joining channels

  @Get('Join')
  joinChannel(channelName: string, username: string) {
    return this.chatService.joinChannel(channelName, username);
  }

  @Get('leave')
  leaveChannel(channelName: string, username: string) {
    return this.chatService.leaveChannel(channelName, username);
  }
  // @Get('user/:id/socket')
  // getUserSocket(@Param('id') userId: number) {
  //   const socketId = this.chatService.getUserSocketById(userId);
  //   return { userId, socketId };
  // }

  // @Get('message/:senderId/:receiverId')
  // sendMessage(
  //   @Param('senderId') senderId: number,
  //   @Param('receiverId') receiverId: number,
  //   @Param('message') message: string,
  // ) {
  //   const receiverSocketId = this.chatService.getUserSocketById(receiverId);
  //   if (receiverSocketId) {
  //     this.chatService.sendMessage(senderId, receiverId, message);
  //     return { status: 'Message sent' };
  //   } else {
  //     return { status: 'User not online' };
  //   }
  // }
}
