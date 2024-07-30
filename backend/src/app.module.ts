// import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { HelloController } from './hello/hello.controller';
// import { HelloService } from './hello/hello.service';
// import { UserModule } from './user/user.module';
// import { PrismaService } from './prisma.service';
// import { PrismaModule } from './prisma.module';

// @Module({
//   imports: [UserModule],
//   controllers: [AppController, HelloController],
//   providers: [AppService, HelloService, PrismaService],
// })
// export class AppModule {}


import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [UserModule, PrismaModule],
})
export class AppModule {}