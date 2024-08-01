import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloController } from './hello/hello.controller';
import { HelloService } from './hello/hello.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [UserModule, AuthModule, PrismaModule, PassportModule.register({ defaultStrategy: 'jwt'})],
  controllers: [AppController, HelloController],
  providers: [AppService, HelloService],
})
export class AppModule {}
