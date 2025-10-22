import { Redis } from '@upstash/redis'

type RedisAdapter = {
  isEnabled: boolean
  get(key: string): Promise<string | null>
  mget(...keys: string[]): Promise<(string | null)[]>
  set(key: string, value: string): Promise<unknown>
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const memoryStore = new Map<string, string>()

const createMemoryAdapter = (): RedisAdapter => ({
  isEnabled: false,
  async get(key) {
    return memoryStore.get(key) ?? null
  },
  async mget(...keys) {
    return keys.map((key) => memoryStore.get(key) ?? null)
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
      return client.get<string | null>(key)
    },
    mget(...keys) {
      return client.mget<string | null>(...keys)
    },
    set(key, value) {
      return client.set(key, value)
    },
  }
}

export const redis: RedisAdapter = redisUrl && redisToken ? createRedisAdapter() : createMemoryAdapter()

export default redis
