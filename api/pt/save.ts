import type { VercelRequest, VercelResponse } from '@vercel/node'

import redis from './redis'
import {
  SavePayloadSchema,
  normaliseProfile,
  normaliseProgress,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
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

    if (profile) {
      const payload = normaliseProfile(profile)
      operations.push(redis.set(profileKey, JSON.stringify(payload)))
    }

    if (progress) {
      const payload = normaliseProgress(progress)
      operations.push(redis.set(progressKey, JSON.stringify(payload)))
    }

    await Promise.all(operations)
    res.status(200).json({ ok: true })
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message })
  }
}
