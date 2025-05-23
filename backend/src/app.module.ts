import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { GameGateway } from './game/game.gateway';
import { GameModule } from './game/game.module';
import { ChatModule } from './chat/chat.module';
import { AppGateway } from './app.gateway';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';


@Module({
  imports: [
      ServeStaticModule.forRoot({
        rootPath: join(__dirname, '..', 'uploads'),
        serveRoot: '/uploads',
      }),
      UserModule,
      AuthModule, 
      PrismaModule, 
      PassportModule.register({ defaultStrategy: 'jwt'}), 
      JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
        }),
        inject: [ConfigService],
      }),
      GameModule,
      ChatModule,
    ],
  controllers: [AppController],
  providers: [AppService, AppGateway, JwtModule],
})
export class AppModule {}
