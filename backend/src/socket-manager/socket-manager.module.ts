import { Module } from '@nestjs/common';
import { SocketManagerService } from './socket-manager.service';

@Module({
  
  providers: [SocketManagerService],
  exports: [SocketManagerService], // Export the service to make it available in other modules
})
export class SocketManagerModule {}
