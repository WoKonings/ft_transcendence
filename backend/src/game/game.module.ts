import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { GameGateway } from './game.gateway';
import { UserModule } from '../user/user.module';
import { GameState } from './game.state'; // Import GameState

@Module({
  imports: [
      PrismaModule,
      forwardRef(() => UserModule ),
    ],
  providers: [GameGateway, GameState], // re-add gamegateway if needed
  exports: [GameState], // Export GameState to be used in other modules if necessary
})
export class GameModule {}
