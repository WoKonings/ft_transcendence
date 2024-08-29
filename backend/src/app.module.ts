import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloController } from './hello/hello.controller';
import { HelloService } from './hello/hello.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { GameGateway } from './game/game.gateway';
import { GameModule } from './game/game.module';
import { AppGateway } from './app.gateway';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { Socket } from 'socket.io';


@Module({
  imports: [UserModule,
      AuthModule, 
      PrismaModule, 
      PassportModule.register({ defaultStrategy: 'jwt'}), 
	  JwtModule.registerAsync({
		imports: [ConfigModule],
		useFactory: async (configService: ConfigService) => ({
		  secret: configService.get<string>('JWT_SECRET'),
		  signOptions: { expiresIn: '5m' }, //todo increase this to like 1d instead of 5 min
		}),
		inject: [ConfigService],
	  }),
      GameModule,
	  ChatModule,
    ],
  controllers: [AppController, HelloController],
  providers: [AppService, HelloService, AppGateway, JwtModule],
})
export class AppModule {}
