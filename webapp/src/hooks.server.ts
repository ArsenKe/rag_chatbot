import type { Handle } from '@sveltejs/kit';
import { verifyAuthToken } from '$lib/server/auth/jwt';
import { prisma } from '$lib/server/db/client';
import { getSupabaseUserFromAccessToken } from '$lib/server/auth/supabase';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  const authProvider = (process.env.AUTH_PROVIDER ?? 'supabase').trim().toLowerCase();

  if (authProvider !== 'jwt') {
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

    if (!event.locals.user) {
      const fallbackToken = event.cookies.get('token');

      if (fallbackToken) {
        const payload = await verifyAuthToken(fallbackToken);
        if (payload) {
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
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
    }
  }

  if (authProvider === 'jwt') {
    const bearer = event.request.headers.get('authorization');
    const cookieToken = event.cookies.get('token');
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookieToken;

    if (token) {
      const payload = await verifyAuthToken(token);
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
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
  }

  return resolve(event);
};
