import { Controller, Put, Body, Param, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChannelRole } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}


}