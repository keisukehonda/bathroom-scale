import type { VercelRequest, VercelResponse } from '@vercel/node'

type SetRow = {
  reps: number
  rpe?: number
  formOk?: boolean
  feedback?: 'HARD' | 'JUST' | 'EASY'
}

type Payload = {
  movementSlug?: string
  step?: number
  tier?: string
  sets?: SetRow[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const payload: Payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!payload?.movementSlug) {
      res.status(400).json({ error: 'movementSlug is required' })
      return
    }

    if (!Array.isArray(payload.sets)) {
      res.status(400).json({ error: 'sets must be an array' })
      return
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
