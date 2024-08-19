import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';  // Import ChatController

@Module({
  providers: [ChatGateway, ChatService],
  controllers: [ChatController],  // Register ChatController
})
export class ChatModule {}