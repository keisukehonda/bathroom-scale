// /api/load.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const keys = await redis.keys('*');

    const data = await Promise.all(
      keys.map(async (key) => ({
        date: key,
        weight: await redis.get<string>(key),
      }))
    );

    res.status(200).json(data);
  } catch (err) {
    console.error("API load error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
