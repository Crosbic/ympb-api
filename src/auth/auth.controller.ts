import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('my-wave')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Эндпоинт для начала авторизации
   * Перенаправляет на страницу авторизации Яндекса
   */
  @Get('auth')
  @Redirect()
  initiateAuth(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('UserId is required');
    }

    // Передаем userId как state параметр
    const authUrl = this.authService.generateAuthUrl(userId);

    return { url: authUrl };
  }

  /**
   * Обработчик callback от Яндекса после авторизации
   */
  @Get('success-login')
  async handleAuthCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.status(400).send('Код авторизации не предоставлен');
    }

    try {
      // Получаем токен по коду
      const tokenData = await this.authService.getTokenByCode(code);

      // Получаем информацию о пользователе
      const userInfo = await this.authService.getUserInfo(
        tokenData.access_token,
      );

      // Отправляем токен Discord боту
      const success = await this.authService.sendTokenToBot(
        userId,
        tokenData.access_token,
        userInfo,
      );

      if (success) {
        // Возвращаем HTML страницу с сообщением об успешной авторизации
        return res.send(`
          <html>
            <head>
              <title>Авторизация успешна</title>
              <style>
                body { 
                  font-family: Arial, sans-serif;
                  text-align: center;
                  margin-top: 100px;
                }
                .success {
                  color: green;
                  font-size: 24px;
                  margin-bottom: 20px;
                }
                .info {
                  font-size: 18px;
                }
              </style>
            </head>
            <body>
              <div class="success">Авторизация в Яндексе успешно завершена!</div>
              <div class="info">Теперь вы можете закрыть это окно и вернуться в Discord.</div>
            </body>
          </html>
        `);
      } else {
        return res.status(500).send('Не удалось отправить токен боту Discord');
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при обработке callback: ${error.message}`,
        error.stack,
      );
      return res
        .status(500)
        .send(`Произошла ошибка при авторизации: ${error.message}`);
    }
  }
}
