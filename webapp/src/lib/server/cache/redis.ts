import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

let redis: ReturnType<typeof createClient> | null = null;

async function getRedis() {
  if (!redisUrl) {
    console.warn('REDIS_URL not set, caching disabled');
    return null;
  }

  if (!redis) {
    redis = createClient({ url: redisUrl });
    redis.on('error', (err) => console.error('Redis error:', err));
    await redis.connect();
  }

  return redis;
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedis();
    if (!client) return null;

    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const client = await getRedis();
    if (!client) return;

    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const client = await getRedis();
    if (!client) return;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redis) {
    await redis.quit();
  }
  process.exit(0);
});
