import type { VercelRequest, VercelResponse } from '@vercel/node'

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

const resolveUserId = (req: VercelRequest) => {
  const queryId = typeof req.query.userId === 'string' ? req.query.userId.trim() : ''
  if (queryId) return queryId
  return 'demo-user'
}

const parseBody = (req: VercelRequest) => {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  if (!redis.isEnabled && process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Redis configuration is missing' })
    return
  }

  const userId = resolveUserId(req)
  const profileKey = `pt:user:${userId}:profile`
  const progressKey = `pt:user:${userId}:progress`

  const body = parseBody(req)
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'Invalid payload' })
    return
  }

  const parsed = SavePayloadSchema.safeParse(body)
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Validation failed', issues: parsed.error.issues })
    return
  }

  const { profile, progress } = parsed.data
  if (!profile && !progress) {
    res.status(400).json({ ok: false, error: 'Nothing to save' })
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

    res.status(200).json(payload)
  } catch (error) {
    console.error('pt/save failed', error)
    res.status(500).json({ ok: false, error: 'internal' })
  }
}
