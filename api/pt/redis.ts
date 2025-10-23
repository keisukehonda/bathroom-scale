import { Redis } from '@upstash/redis'

type RedisValue = string | number | boolean | null | Record<string, unknown> | unknown[]

type RedisAdapter = {
  isEnabled: boolean
  get(key: string): Promise<RedisValue | null>
  mget(...keys: string[]): Promise<(RedisValue | null)[]>
  set(key: string, value: string): Promise<unknown>
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const memoryStore = new Map<string, string>()

const decode = (value: string | undefined): RedisValue | null => {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const createMemoryAdapter = (): RedisAdapter => ({
  isEnabled: false,
  async get(key) {
    const stored = memoryStore.get(key)
    return decode(stored)
  },
  async mget(...keys) {
    return keys.map((key) => decode(memoryStore.get(key)))
  },
  async set(key, value) {
    memoryStore.set(key, value)
    return 'OK'
  },
})

const createRedisAdapter = (): RedisAdapter => {
  const client = new Redis({
    url: redisUrl!,
    token: redisToken!,
  })

  return {
    isEnabled: true,
    get(key) {
      return client.get<RedisValue | null>(key)
    },
    mget(...keys) {
      return client.mget<RedisValue | null>(...keys)
    },
    set(key, value) {
      return client.set(key, value)
    },
  }
}

export const redis: RedisAdapter = redisUrl && redisToken ? createRedisAdapter() : createMemoryAdapter()

export default redis
