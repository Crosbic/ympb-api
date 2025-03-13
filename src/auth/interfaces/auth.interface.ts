export interface YandexTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  token_type: string
}

export interface YandexUserInfo {
  id: string
  login: string
  client_id: string
  display_name: string
  real_name: string
  first_name: string
  last_name: string
  sex: string
  default_avatar_id: string
  is_avatar_empty: boolean
  psuid: string
}
