import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: Request) {
  const { date, weight } = await req.json();

  if (!date || !weight) {
    return new Response("Invalid data", { status: 400 });
  }

  await redis.set(date, weight);
  return new Response("OK");
}
