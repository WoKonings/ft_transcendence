import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { UserModule } from '../user/user.module';
import { SocketManagerModule } from 'src/socket-manager/socket-manager.module';
import { PrismaModule } from 'src/prisma.module';


@Module({
  imports: [UserModule, SocketManagerModule, PrismaModule], // Import UserModule to access user-related services
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
