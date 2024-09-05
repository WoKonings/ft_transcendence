import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from 'src/prisma.module';
import { JwtService } from '@nestjs/jwt';


@Module({
  imports: [UserModule, PrismaModule],
  providers: [ChatGateway, ChatService, JwtService],
})
export class ChatModule {}