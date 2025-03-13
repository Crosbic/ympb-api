// src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  })

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  })

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT') || 3000
  const domain = configService.get<string>('IP') || '0.0.0.0'

  await app.listen(port, domain)
  Logger.log(`Сервер запущен на ${domain}:${port}`)
  Logger.log(
    `URL для авторизации: ${domain}:${port}/my-wave/auth?userId=YOUR_USER_ID`,
  )
}
bootstrap()
