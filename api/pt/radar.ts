import type { VercelRequest, VercelResponse } from '@vercel/node'

import redis from './redis'
import { ProgressSchema, makeDefaultProgress, normaliseProgress } from '../../lib/schemas/pt'

export type RadarTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type RadarAxis = {
  movementSlug: 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'
  stepNo: number
  tier: RadarTier
  score?: number
  locked: boolean
  lockReason?: string
}

const resolveUserId = (req: VercelRequest) => {
  const queryId = typeof req.query.userId === 'string' ? req.query.userId.trim() : ''
  if (queryId) return queryId
  return 'demo-user'
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
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    res.status(500).json({ error: 'Redis configuration is missing' })
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

    res.status(200).json(axes)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
