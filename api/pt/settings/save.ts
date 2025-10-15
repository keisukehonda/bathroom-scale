import type { VercelRequest, VercelResponse } from '@vercel/node'

type SettingsPayload = {
  hasPullupBar?: boolean
  hasWallSpace?: boolean
  rules?: {
    bridgeDependsOn?: 'any-step5' | 'none'
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const payload: SettingsPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!payload) {
      res.status(400).json({ error: 'Invalid payload' })
      return
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
