import type { Handle } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { getSupabaseUserFromAccessToken } from '$lib/server/auth/supabase';
import { checkRateLimit, createRateLimitError } from '$lib/server/middleware/ratelimit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  const token = event.cookies.get('sb-access-token');

  if (token) {
    const supabaseUser = await getSupabaseUserFromAccessToken(token);
    const email = supabaseUser?.email?.toLowerCase();

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, driverId: true }
      });

      if (user) {
        event.locals.user = {
          id: user.id,
          role: user.role,
          email: user.email,
          driverId: user.driverId ? user.driverId.toString() : null
        };
      }
    }
  }

  // Apply rate limiting
  const limiterType = event.url.pathname.includes('/auth') ? 'auth' : 'api';
  const allowed = await checkRateLimit(event, limiterType);

  if (!allowed) {
    return createRateLimitError(limiterType);
  }

  return resolve(event);
};
