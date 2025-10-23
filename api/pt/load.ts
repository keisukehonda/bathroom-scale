import type { IncomingMessage, ServerResponse } from 'http'

import redis from './redis'
import {
  ProfileSchema,
  ProgressSchema,
  makeDefaultProfile,
  makeDefaultProgress,
  normaliseProfile,
  normaliseProgress,
  type PTLoadResponse,
} from '../../lib/schemas/pt'
import { DEFAULT_USER_ID } from '../../src/lib/pt/user'

type PTRequest = IncomingMessage & {
  body?: unknown
  query?: Record<string, unknown>
}

const resolveUserId = (req: PTRequest) => {
  if (req.url) {
    try {
      const url = new URL(req.url, 'http://localhost')
      const searchId = url.searchParams.get('userId')?.trim()
      if (searchId) return searchId
    } catch {
      // ignore parse errors and fall back to other strategies
    }
  }

  const queryId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : ''
  if (queryId) return queryId
  return DEFAULT_USER_ID
}

const parseJSON = <T>(value: string | null | undefined): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export default async function handler(req: PTRequest, res: ServerResponse) {
  if (req.method && req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }

  if (!redis.isEnabled && process.env.NODE_ENV === 'production') {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Redis configuration is missing' }))
    return
  }

  const userId = resolveUserId(req)
  const profileKey = `pt:user:${userId}:profile`
  const progressKey = `pt:user:${userId}:progress`

  try {
    const [profileRaw, progressRaw] = await redis.mget(profileKey, progressKey)

    const profileJSON = parseJSON(profileRaw)
    const parsedProfile = profileJSON ? ProfileSchema.safeParse(profileJSON) : null
    const profile = parsedProfile?.success
      ? normaliseProfile(parsedProfile.data)
      : makeDefaultProfile()

    const progressJSON = parseJSON(progressRaw)
    const parsedProgress = progressJSON ? ProgressSchema.safeParse(progressJSON) : null
    const progress = parsedProgress?.success
      ? normaliseProgress(parsedProgress.data)
      : makeDefaultProgress()

    const payload: PTLoadResponse = {
      profile,
      progress,
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  } catch (error) {
    console.error('pt/load failed', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'internal' }))
  }
}
