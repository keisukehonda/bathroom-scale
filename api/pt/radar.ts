import type { IncomingMessage, ServerResponse } from 'http'

import redis from './redis'
import { ProgressSchema, makeDefaultProgress, normaliseProgress } from '../../lib/schemas/pt'
import { DEFAULT_USER_ID } from '../../src/lib/pt/user'

export type RadarTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type RadarAxis = {
  movementSlug: 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'
  stepNo: number
  tier: RadarTier
  score?: number
  locked: boolean
  lockReason?: string
}

type PTRequest = IncomingMessage & {
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

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Redis configuration is missing' }))
    return
  }

  const userId = resolveUserId(req)
  const progressKey = `pt:user:${userId}:progress`

  try {
    const stored = await redis.get<string | null>(progressKey)
    const json = parseJSON(stored)
    const parsed = json ? ProgressSchema.safeParse(json) : null
    const progress = parsed?.success ? normaliseProgress(parsed.data) : makeDefaultProgress()

    const axes: RadarAxis[] = progress.movements.map((movement) => ({
      movementSlug: movement.slug,
      stepNo: movement.stepNo,
      tier: movement.tier,
      score: movement.score,
      locked: false,
    }))

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(axes))
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: (error as Error).message }))
  }
}
