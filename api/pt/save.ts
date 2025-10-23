import type { IncomingMessage, ServerResponse } from 'http'

import redis from './redis'
import {
  ProfileSchema,
  ProgressSchema,
  SavePayloadSchema,
  makeDefaultProfile,
  makeDefaultProgress,
  normaliseProfile,
  normaliseProgress,
  type PTSaveResponse,
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
      // ignore parse errors
    }
  }

  const queryId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : ''
  if (queryId) return queryId
  return DEFAULT_USER_ID
}

const parseBody = (req: PTRequest) => {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
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
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }))
    return
  }

  if (!redis.isEnabled && process.env.NODE_ENV === 'production') {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'Redis configuration is missing' }))
    return
  }

  const userId = resolveUserId(req)
  const profileKey = `pt:user:${userId}:profile`
  const progressKey = `pt:user:${userId}:progress`

  const body = parseBody(req)
  if (!body || typeof body !== 'object') {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'Invalid payload' }))
    return
  }

  const parsed = SavePayloadSchema.safeParse(body)
  if (!parsed.success) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'Validation failed', issues: parsed.error.issues }))
    return
  }

  const { profile, progress } = parsed.data
  if (!profile && !progress) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'Nothing to save' }))
    return
  }

  try {
    const operations: Promise<unknown>[] = []
    let nextProfile = profile ? normaliseProfile(profile) : undefined
    let nextProgress = progress ? normaliseProgress(progress) : undefined

    if (nextProfile) {
      operations.push(redis.set(profileKey, JSON.stringify(nextProfile)))
    }

    if (nextProgress) {
      operations.push(redis.set(progressKey, JSON.stringify(nextProgress)))
    }

    await Promise.all(operations)

    if (!nextProfile || !nextProgress) {
      const [profileRaw, progressRaw] = await redis.mget(profileKey, progressKey)

      if (!nextProfile) {
        const profileJSON = parseJSON(profileRaw)
        const parsedProfile = profileJSON ? ProfileSchema.safeParse(profileJSON) : null
        nextProfile = parsedProfile?.success
          ? normaliseProfile(parsedProfile.data)
          : makeDefaultProfile()
      }

      if (!nextProgress) {
        const progressJSON = parseJSON(progressRaw)
        const parsedProgress = progressJSON ? ProgressSchema.safeParse(progressJSON) : null
        nextProgress = parsedProgress?.success
          ? normaliseProgress(parsedProgress.data)
          : makeDefaultProgress()
      }
    }

    const payload: PTSaveResponse = {
      ok: true,
      profile: nextProfile,
      progress: nextProgress,
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  } catch (error) {
    console.error('pt/save failed', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'internal' }))
  }
}
