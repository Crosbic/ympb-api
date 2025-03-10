import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  YandexTokenResponse,
  YandexUserInfo,
} from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Создает URL для авторизации через Яндекс
   */
  generateAuthUrl(state?: string): string {
    const clientId = this.configService.get<string>('YANDEX_CLIENT_ID');
    const redirectUri = this.configService.get<string>('YANDEX_REDIRECT_URI');

    console.log(this.configService.get<string>('YANDEX_CLIENT_ID'));

    // Создаем объект URLSearchParams правильным способом
    const params = new URLSearchParams();
    params.append('response_type', 'code');
    params.append('client_id', clientId || '');
    params.append('redirect_uri', redirectUri || '');

    if (state) {
      params.append('state', state);
    }

    return `https://oauth.yandex.ru/authorize?${params.toString()}`;
  }

  /**
   * Получение токена по коду авторизации
   */
  async getTokenByCode(code: string): Promise<YandexTokenResponse> {
    try {
      const clientId = this.configService.get<string>('YANDEX_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'YANDEX_CLIENT_SECRET',
      );
      const redirectUri = this.configService.get<string>('YANDEX_REDIRECT_URI');

      // Создаем объект URLSearchParams правильным способом
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('client_id', clientId || '');
      params.append('client_secret', clientSecret || '');
      params.append('redirect_uri', redirectUri || '');

      const response = await axios.post<YandexTokenResponse>(
        'https://oauth.yandex.ru/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Ошибка получения токена: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Не удалось получить токен доступа');
    }
  }

  /**
   * Обновление токена доступа
   */
  async refreshToken(refreshToken: string): Promise<YandexTokenResponse> {
    try {
      const clientId = this.configService.get<string>('YANDEX_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'YANDEX_CLIENT_SECRET',
      );

      // Создаем объект URLSearchParams правильным способом
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', clientId || '');
      params.append('client_secret', clientSecret || '');

      const response = await axios.post<YandexTokenResponse>(
        'https://oauth.yandex.ru/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Ошибка обновления токена: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Не удалось обновить токен доступа');
    }
  }

  /**
   * Получение информации о пользователе по токену
   */
  async getUserInfo(accessToken: string): Promise<YandexUserInfo> {
    try {
      const response = await axios.get<YandexUserInfo>(
        'https://login.yandex.ru/info',
        {
          params: {
            format: 'json',
          },
          headers: {
            Authorization: `OAuth ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Ошибка получения информации о пользователе: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException(
        'Не удалось получить информацию о пользователе',
      );
    }
  }

  /**
   * Отправка токена Discord боту
   */
  async sendTokenToBot(
    userId: string,
    accessToken: string,
    userInfo: YandexUserInfo,
  ): Promise<boolean> {
    try {
      const botCallbackUrl = this.configService.get<string>(
        'DISCORD_BOT_CALLBACK_URL',
      );

      if (botCallbackUrl != null) {
        await axios.post(botCallbackUrl, {
          userId,
          accessToken,
          userInfo: {
            id: userInfo.id,
            displayName: userInfo.display_name,
            email: userInfo.default_email,
            firstName: userInfo.first_name,
            lastName: userInfo.last_name,
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Ошибка отправки токена боту: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
