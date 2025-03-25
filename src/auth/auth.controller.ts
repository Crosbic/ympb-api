// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Query,
  Redirect,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common'
import { Response } from 'express'
import { AuthService } from './auth.service'

@Controller('my-wave')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private readonly authService: AuthService) {}

  /**
   * Эндпоинт для начала авторизации
   */
  @Get('auth')
  @Redirect()
  initiateAuth(
    @Query('userId') userId: string,
    @Query('debug') debug?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('UserId is required')
    }

    if (debug) {
      this.logger.debug(`Инициирование авторизации для пользователя ${userId}`)
    }

    const authUrl = this.authService.generateAuthUrl(userId)
    this.logger.log(`Генерация URL авторизации: ${authUrl}`)

    return { url: authUrl }
  }

  /**
   * Обработчик callback от Яндекса после авторизации
   * Локальный URI для разработки: http://localhost:3000/my-wave/auth-result
   */
  @Get('auth-result')
  async handleAuthCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Query() allParams: Record<string, string>,
    @Res() res: Response,
  ) {
    this.logger.debug('Получен callback с параметрами:', allParams)

    if (!code) {
      this.logger.error('Код авторизации отсутствует')
      return res.status(400).send('Код авторизации не предоставлен')
    }

    try {
      this.logger.log(`Получен код авторизации для пользователя ${userId}`)

      const tokenData = await this.authService.getTokenByCode(code)
      this.logger.debug('Получен токен доступа')

      const userInfo = await this.authService.getUserInfo(
        tokenData.access_token,
      )

      this.logger.debug(
        `Получена информация о пользователе Яндекса: ${JSON.stringify(userInfo)}`,
      )

      this.logger.debug(`Токен: ${JSON.stringify(tokenData.access_token)}`)

      this.logger.log(`Отправляем информацию боту для пользователя ${userId}`)

      const success = await this.authService.sendTokenToBot(
        userId,
        tokenData.access_token,
        userInfo,
      )

      // Мне лень было писать отдельный микро проект под странички редиректов, и не надо меня осуждать, перепишу как основной код бота будет готов
      if (success) {
        this.logger.log('Токен успешно отправлен Discord боту')
        return res.send(`
          <html lang="en">
            <head > 
              <title>My Wave: yandex music discord bot</title>
              <style>
                body { 
                  font-family: Arial, sans-serif;
                  text-align: center;
                  margin-top: 100px;
                  background-color: #f5f5f5;
                }
                .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                  max-width: 500px;
                  margin: 0 auto;
                }
                .success {
                  color: #4caf50;
                  font-size: 24px;
                  margin-bottom: 20px;
                }
                .info {
                  font-size: 18px;
                  margin-bottom: 20px;
                  line-height: 1.5;
                  background-color: #e8f5e9;
                  padding: 15px;
                  border-radius: 5px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 1em;
                }
                .close-button {
                  background-color: #4caf50;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  font-size: 16px;
                  border-radius: 4px;
                  cursor: pointer;
                }
                .avatar {
                  border-radius: 50%;
                }
              </style>
            <link rel="icon" type="image/png" href="/favicon.png">
            </head>
            <body>
              <div class="container">
                <div class="success">Авторизация в Яндексе успешно завершена!</div>
                <div class="info">
                  <img alt="Yandex avatar" class="avatar" src="https://avatars.mds.yandex.net/get-yapic/${userInfo.default_avatar_id}/islands-retina-50" />
                  <div>Вы вошли в аккаунт <strong>${userInfo.display_name || userInfo.real_name || userInfo.login}</strong>.</div>
                  <div>Теперь вы можете закрыть это окно и вернуться в Discord.</div>
                </div>
                <button class="close-button" onclick="window.close()">Закрыть окно</button>
              </div>
            </body>
          </html>
        `)
      } else {
        this.logger.error('Не удалось отправить токен боту Discord')
        return res.status(500).send(`
          <html lang="en">
            <head>
              <title>My Wave: yandex music discord bot</title>
              <style>
                body { 
                  font-family: Arial, sans-serif;
                  text-align: center;
                  margin-top: 100px;
                  background-color: #f5f5f5;
                }
                .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                  max-width: 500px;
                  margin: 0 auto;
                }
                .error {
                  color: #f44336;
                  font-size: 24px;
                  margin-bottom: 20px;
                }
                .info {
                  font-size: 18px;
                  margin-bottom: 20px;
                }
                .retry-button {
                  background-color: #2196f3;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  font-size: 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  margin-right: 10px;
                }
                .close-button {
                  background-color: #f44336;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  font-size: 16px;
                  border-radius: 4px;
                  cursor: pointer;
                }
              </style>
              <link rel="icon" type="image/png" href="/favicon.png">
            </head>
            <body>
              <div class="container">
                <div class="error">Ошибка при авторизации</div>
                <div class="info">Не удалось отправить токен боту Discord.</div>
                <div class="info">Скорее всего на вашем аккаунте отсутствует активная подписка Яндекс Плюс.</div>
                <div class="info">Если это не так, сообщите о проблеме на почту: contact@crosbic.ru</div>
                <button class="retry-button" onclick="window.location.href='/my-wave/auth?userId=${userId}'">Попробовать снова</button>
                <button class="close-button" onclick="window.close()">Закрыть окно</button>
              </div>
            </body>
          </html>
        `)
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при обработке callback: ${error.message}`,
        error.stack,
      )
      return res.status(500).send(`
        <html lang="en">
          <head>
            <title>My Wave: yandex music discord bot</title>
            <style>
              body { 
                font-family: Arial, sans-serif;
                text-align: center;
                margin-top: 100px;
                background-color: #f5f5f5;
              }
              .container {
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                margin: 0 auto;
              }
              .error {
                color: #f44336;
                font-size: 24px;
                margin-bottom: 20px;
              }
              .info {
                font-size: 18px;
                margin-bottom: 20px;
              }
              .details {
                font-size: 14px;
                color: #757575;
                margin-bottom: 20px;
                text-align: left;
                padding: 10px;
                background-color: #f5f5f5;
                border-radius: 4px;
                overflow-wrap: break-word;
              }
              .retry-button {
                background-color: #2196f3;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 10px;
              }
              .close-button {
                background-color: #f44336;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 16px;
                border-radius: 4px;
                cursor: pointer;
              }
            </style>
            <link rel="icon" type="image/png" href="/favicon.png">
          </head>
          <body>
            <div class="container">
              <div class="error">Ошибка при авторизации</div>
              <div class="info">Произошла ошибка при обработке авторизации:</div>
              <div class="details">${error.message}</div>
              <button class="retry-button" onclick="window.location.href='/my-wave/auth?userId=${userId}'">Попробовать снова</button>
              <button class="close-button" onclick="window.close()">Закрыть окно</button>
            </div>
          </body>
        </html>
      `)
    }
  }
}
