import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloController } from './hello/hello.controller';
import { HelloService } from './hello/hello.service';
import { UserModule } from './user/user.module';
// import { PrismaService } from './prisma.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
// import { AuthService } from './auth/auth.service'

@Module({
  imports: [UserModule, AuthModule, PrismaModule],
  controllers: [AppController, HelloController],
  providers: [AppService, HelloService],
})
export class AppModule {}

//stripped code from gpt, stick to the top instead
// import { Module } from '@nestjs/common';
// import { UserModule } from './user/user.module';
// import { PrismaModule } from './prisma.module';

// @Module({
//   imports: [UserModule, PrismaModule],
// })
// export class AppModule {}