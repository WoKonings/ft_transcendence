import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';


async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({
	whitelist: true, // Strip properties that are not in the DTO
	forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are sent
	transform: true, // Automatically transform payloads to match the DTO types
  }))
  await app.listen(3000);
}
bootstrap();
