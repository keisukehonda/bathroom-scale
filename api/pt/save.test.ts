import { describe, expect, it, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import saveHandler from './save'
import loadHandler from './load'
import redis from './redis'
import { makeDefaultProfile, makeDefaultProgress } from '../../lib/schemas/pt'

const DEFAULT_USER_ID = 'demo-user'
const profileKey = `pt:user:${DEFAULT_USER_ID}:profile`
const progressKey = `pt:user:${DEFAULT_USER_ID}:progress`

type MockResponse = Partial<VercelResponse> & {
  statusCode: number
  payload: unknown
}

const createResponse = (): MockResponse => ({
  statusCode: 0,
  payload: undefined,
  status(code: number) {
    this.statusCode = code
    return this
  },
  json(body: unknown) {
    this.payload = body
    return this
  },
})

describe('pt save handler', () => {
  beforeEach(async () => {
    await redis.set(profileKey, JSON.stringify(makeDefaultProfile()))
    await redis.set(progressKey, JSON.stringify(makeDefaultProgress()))
  })

  it('persists the profile to redis and returns it on load', async () => {
    const saveReq = {
      method: 'POST',
      query: {},
      body: JSON.stringify({
        profile: {
          displayName: 'Alice',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      }),
    } as unknown as VercelRequest
    const saveRes = createResponse()

    await saveHandler(saveReq, saveRes as unknown as VercelResponse)

    expect(saveRes.statusCode).toBe(200)
    const storedRaw = await redis.get(profileKey)
    expect(storedRaw).not.toBeNull()
    expect(JSON.parse(storedRaw as string)).toMatchObject({ displayName: 'Alice' })

    const loadReq = { method: 'GET', query: {} } as unknown as VercelRequest
    const loadRes = createResponse()

    await loadHandler(loadReq, loadRes as unknown as VercelResponse)

    expect(loadRes.statusCode).toBe(200)
    const payload = loadRes.payload as { profile: { displayName: string } }
    expect(payload.profile.displayName).toBe('Alice')
  })
})
