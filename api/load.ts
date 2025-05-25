import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler() {
  const keys = await redis.keys("*");
  const data = await Promise.all(
    keys.map(async (key) => ({
      date: key,
      weight: await redis.get<string>(key),
    }))
  );
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
