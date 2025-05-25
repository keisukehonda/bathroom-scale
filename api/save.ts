import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { date, weight } = req.body;

    if (!date || !weight) {
      res.status(400).json({ error: "Missing parameters: date or weight" });
      return;
    }

    await redis.set(date, weight);
    res.status(200).json({ message: "Saved" });
  } catch (err) {
    console.error("save failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
