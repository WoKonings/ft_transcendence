import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { GameGateway } from './game.gateway';
import { UserModule } from '../user/user.module';
import { GameState } from './game.state'; // Import GameState
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
      PrismaModule,
      forwardRef(() => UserModule ),
    ],
  providers: [GameGateway, GameState, JwtService, UserService], // Provide GameState
  exports: [GameState], // Export GameState to be used in other modules if necessary
})
export class GameModule {}
