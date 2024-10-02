import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma.module';
import { UserGateway } from './user.gateway';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
    forwardRef(() => GameModule)
  ],
  providers: [UserService, UserGateway],
  controllers: [UserController],
  exports: [UserService, UserGateway],
})
export class UserModule {}