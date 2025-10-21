import type { VercelRequest, VercelResponse } from '@vercel/node'

import redis from './redis'
import {
  ProfileSchema,
  ProgressSchema,
  makeDefaultProfile,
  makeDefaultProgress,
  normaliseProfile,
  normaliseProgress,
} from '../../lib/schemas/pt'

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

    res.status(200).json({ profile, progress })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
