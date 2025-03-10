import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import {
  YandexTokenResponse,
  YandexUserInfo,
} from './interfaces/auth.interface'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(private readonly configService: ConfigService) {}

  /**
   * Создает URL для авторизации через Яндекс
   */
  generateAuthUrl(state?: string): string {
    const clientId = this.configService.get<string>('YANDEX_CLIENT_ID')
    const redirectUri = this.configService.get<string>('YANDEX_REDIRECT_URI')

    this.logger.debug(
      `Генерация URL для авторизации с redirect_uri: ${redirectUri}`,
    )

    const params = new URLSearchParams()
    params.append('response_type', 'code')
    params.append('client_id', clientId || '')
    params.append('redirect_uri', redirectUri || '')

    if (state) {
      params.append('state', state)
    }

    return `https://oauth.yandex.ru/authorize?${params.toString()}`
  }

  /**
   * Получение токена по коду авторизации
   */
  async getTokenByCode(code: string): Promise<YandexTokenResponse> {
    try {
      const clientId = this.configService.get<string>('YANDEX_CLIENT_ID')
      const clientSecret = this.configService.get<string>(
        'YANDEX_CLIENT_SECRET',
      )
      const redirectUri = this.configService.get<string>('YANDEX_REDIRECT_URI')

      this.logger.debug(
        `Получение токена по коду с redirect_uri: ${redirectUri}`,
      )

      const params = new URLSearchParams()
      params.append('grant_type', 'authorization_code')
      params.append('code', code)
      params.append('client_id', clientId || '')
      params.append('client_secret', clientSecret || '')
      params.append('redirect_uri', redirectUri || '')

      const response = await axios.post<YandexTokenResponse>(
        'https://oauth.yandex.ru/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      this.logger.debug('Токен успешно получен')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Ошибка запроса токена: ${error.response.status} ${JSON.stringify(error.response.data)}`,
        )
      } else {
        this.logger.error(
          `Ошибка получения токена: ${error.message}`,
          error.stack,
        )
      }
      throw new UnauthorizedException('Не удалось получить токен доступа')
    }
  }

  /**
   * Получение информации о пользователе по токену
   */
  async getUserInfo(accessToken: string): Promise<YandexUserInfo> {
    try {
      this.logger.debug('Запрос информации о пользователе')

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
      )

      this.logger.debug(
        `Получена информация о пользователе: ${response.data.display_name}`,
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Ошибка запроса информации: ${error.response.status} ${JSON.stringify(error.response.data)}`,
        )
      } else {
        this.logger.error(
          `Ошибка получения информации о пользователе: ${error.message}`,
          error.stack,
        )
      }
      throw new UnauthorizedException(
        'Не удалось получить информацию о пользователе',
      )
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
      )

      this.logger.debug(`Отправка токена боту по URL: ${botCallbackUrl}`)

      const payload = {
        userId,
        accessToken,
        userInfo: {
          id: userInfo.id,
          displayName:
            userInfo.display_name || userInfo.real_name || userInfo.login,
          email: userInfo.default_email,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
        },
      }

      if (botCallbackUrl != null) {
        await axios.post(botCallbackUrl, payload)
      }

      this.logger.debug('Токен успешно отправлен Discord боту')
      return true
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Ошибка отправки токена боту: ${error.response.status} ${JSON.stringify(error.response.data)}`,
        )
      } else {
        this.logger.error(
          `Ошибка отправки токена боту: ${error.message}`,
          error.stack,
        )
      }
      return false
    }
  }

  /**
   * Обновление токена доступа
   */
  // Пока нигде не используется, но раз уж написал, пусть будет, а то мало ли
  async refreshToken(refreshToken: string): Promise<YandexTokenResponse> {
    try {
      const clientId = this.configService.get<string>('YANDEX_CLIENT_ID')
      const clientSecret = this.configService.get<string>(
        'YANDEX_CLIENT_SECRET',
      )

      this.logger.debug('Обновление токена доступа')

      const params = new URLSearchParams()
      params.append('grant_type', 'refresh_token')
      params.append('refresh_token', refreshToken)
      params.append('client_id', clientId || '')
      params.append('client_secret', clientSecret || '')

      const response = await axios.post<YandexTokenResponse>(
        'https://oauth.yandex.ru/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      this.logger.debug('Токен успешно обновлен')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Ошибка обновления токена: ${error.response.status} ${JSON.stringify(error.response.data)}`,
        )
      } else {
        this.logger.error(
          `Ошибка обновления токена: ${error.message}`,
          error.stack,
        )
      }
      throw new UnauthorizedException('Не удалось обновить токен доступа')
    }
  }
}
