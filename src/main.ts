// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'], // Добавляем debug уровень для отладки
  });

  // Настройка CORS для локальной разработки
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port, '0.0.0.0');
  Logger.log(`Сервер запущен на порту ${port}`, 'Bootstrap');
  Logger.log(
    `Локальный URL для авторизации: http://localhost:${port}/my-wave/auth?userId=YOUR_USER_ID`,
    'Bootstrap',
  );
}
bootstrap();
