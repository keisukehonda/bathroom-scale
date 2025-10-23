import { makeDefaultProfile, normaliseProfile, type Profile } from '../../../lib/schemas/pt'

const PROFILE_STORAGE_KEY_PREFIX = 'pt-profile'

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const resolveStorage = (storage?: Storage | null) => {
  if (storage) return storage
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

export const loadStoredProfile = (userId: string, storage?: Storage | null): Profile | null => {
  const resolved = resolveStorage(storage)
  if (!resolved) return null
  const key = `${PROFILE_STORAGE_KEY_PREFIX}:${userId}`
  const parsed = safeParse<Partial<Profile> | Profile | null>(resolved.getItem(key), null)
  if (!parsed) return null
  return normaliseProfile(parsed)
}

export const saveStoredProfile = (userId: string, profile: Profile, storage?: Storage | null) => {
  const resolved = resolveStorage(storage)
  if (!resolved) return
  const key = `${PROFILE_STORAGE_KEY_PREFIX}:${userId}`
  resolved.setItem(key, JSON.stringify(profile))
}

export const loadOrDefaultProfile = (userId: string, storage?: Storage | null): Profile => {
  const stored = loadStoredProfile(userId, storage)
  return stored ?? makeDefaultProfile()
}
