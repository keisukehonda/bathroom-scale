import { describe, expect, it, beforeEach } from 'vitest'
import type { ServerResponse } from 'http'

import saveHandler from './save'
import loadHandler from './load'
import redis from './redis'
import { makeDefaultProfile, makeDefaultProgress } from '../../lib/schemas/pt'
import { DEFAULT_USER_ID } from '../../src/lib/pt/user'

const profileKey = `pt:user:${DEFAULT_USER_ID}:profile`
const progressKey = `pt:user:${DEFAULT_USER_ID}:progress`

type MockResponse = Partial<ServerResponse> & {
  statusCode: number
  headers: Record<string, string>
  payload: unknown
}

const createResponse = (): MockResponse => ({
  statusCode: 0,
  headers: {},
  payload: undefined,
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value
    return this
  },
  end(chunk?: unknown) {
    if (typeof chunk === 'string') {
      try {
        this.payload = JSON.parse(chunk)
      } catch {
        this.payload = chunk
      }
    } else if (Buffer.isBuffer(chunk)) {
      const text = chunk.toString('utf8')
      try {
        this.payload = JSON.parse(text)
      } catch {
        this.payload = text
      }
    } else {
      this.payload = chunk
    }
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
      url: '/api/pt/save',
      body: JSON.stringify({
        profile: {
          displayName: 'Alice',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      }),
    } as unknown
    const saveRes = createResponse()

    await saveHandler(saveReq as never, saveRes as never)

    expect(saveRes.statusCode).toBe(200)
    const storedRaw = await redis.get(profileKey)
    expect(storedRaw).not.toBeNull()
    expect(JSON.parse(storedRaw as string)).toMatchObject({ displayName: 'Alice' })

    const loadReq = { method: 'GET', url: '/api/pt/load' } as unknown
    const loadRes = createResponse()

    await loadHandler(loadReq as never, loadRes as never)

    expect(loadRes.statusCode).toBe(200)
    const payload = loadRes.payload as { profile: { displayName: string } }
    expect(payload.profile.displayName).toBe('Alice')
  })
})
