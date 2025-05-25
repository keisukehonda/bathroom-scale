import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: Request) {
  try {
    const { date, weight } = await req.json();
    if (!date || !weight) {
      return new Response("Missing data", { status: 400 });
    }

    await redis.set(date, weight);
    return new Response("OK");
  } catch (err) {
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
}
