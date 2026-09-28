import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { RequestEvent } from '@sveltejs/kit';

// Initialize with Railway Redis
const redis = new Redis({
  url: process.env.REDIS_URL
});

// Create rate limiters
const apiLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
  analytics: true,
  prefix: 'ratelimit:api'
});

const authLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 login attempts per 15 min
  analytics: true,
  prefix: 'ratelimit:auth'
});

const tourApiLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 requests per minute
  analytics: true,
  prefix: 'ratelimit:tour'
});

export async function checkRateLimit(
  event: RequestEvent,
  limiterType: 'api' | 'auth' | 'tour' = 'api'
): Promise<boolean> {
  // Get user ID or IP for rate limiting
  const identifier = event.locals.user?.id || event.getClientAddress();

  try {
    const limiter =
      limiterType === 'auth'
        ? authLimiter
        : limiterType === 'tour'
          ? tourApiLimiter
          : apiLimiter;

    const { success, limit, remaining, reset, pending } = await limiter.limit(identifier);

    // Attach headers
    event.response?.headers.set('X-RateLimit-Limit', String(limit));
    event.response?.headers.set('X-RateLimit-Remaining', String(remaining));
    event.response?.headers.set('X-RateLimit-Reset', String(reset));

    return success;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if Redis is down
    return true;
  }
}

export function createRateLimitError(limiterType: string) {
  return new Response('Too many requests. Please try again later.', {
    status: 429,
    statusText: 'Too Many Requests'
  });
}
