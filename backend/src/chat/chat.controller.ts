import { Controller, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('user/:id/socket')
  getUserSocket(@Param('id') userId: number) {
    const socketId = this.chatService.getUserSocket(userId);
    return { userId, socketId };
  }

  @Get('message/:senderId/:receiverId')
  sendMessage(
    @Param('senderId') senderId: number,
    @Param('receiverId') receiverId: number,
    @Param('message') message: string,
  ) {
    const receiverSocketId = this.chatService.getUserSocket(receiverId);
    if (receiverSocketId) {
      this.chatService.sendMessage(senderId, receiverId, message);
      return { status: 'Message sent' };
    } else {
      return { status: 'User not online' };
    }
  }
}
