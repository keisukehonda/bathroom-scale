import type { Profile as SchemaProfile } from '../../lib/schemas/pt'
import { PROFILE_FALLBACK_DISPLAY_NAME } from '../../lib/schemas/pt'

export type Profile = SchemaProfile

export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<Profile>
  return typeof candidate.displayName === 'string' && typeof candidate.updatedAt === 'string'
}

export function safeDisplayName(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : PROFILE_FALLBACK_DISPLAY_NAME
  }

  if (isProfile(value)) {
    const trimmed = value.displayName.trim()
    return trimmed.length > 0 ? trimmed : PROFILE_FALLBACK_DISPLAY_NAME
  }

  return PROFILE_FALLBACK_DISPLAY_NAME
}
