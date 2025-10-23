import type { IncomingMessage, ServerResponse } from 'http'

import { DEFAULT_USER_ID } from '../../../src/lib/pt/user'

type SettingsPayload = {
  hasPullupBar?: boolean
  hasWallSpace?: boolean
  rules?: {
    bridgeDependsOn?: 'any-step5' | 'none'
  }
}

type SettingsRequest = IncomingMessage & {
  body?: unknown
  query?: Record<string, unknown>
}

const getUserId = (req: SettingsRequest) => {
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

export default async function handler(req: SettingsRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }

  try {
    const payload: SettingsPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!payload) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid payload' }))
      return
    }

    const userId = getUserId(req)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, userId }))
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: (error as Error).message }))
  }
}
