import { DEFAULT_USER_ID } from './pt/user'

export const USER_ID = DEFAULT_USER_ID

export function api(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}userId=${encodeURIComponent(USER_ID)}`
}
