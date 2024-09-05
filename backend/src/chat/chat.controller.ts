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