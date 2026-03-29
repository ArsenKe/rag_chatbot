import type { Handle } from '@sveltejs/kit';
import { verifyAuthToken } from '$lib/server/auth/jwt';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  const authProvider = process.env.AUTH_PROVIDER ?? 'jwt';

  if (authProvider === 'jwt') {
    const bearer = event.request.headers.get('authorization');
    const cookieToken = event.cookies.get('token');
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookieToken;

    if (token) {
      const payload = await verifyAuthToken(token);
      if (payload) {
        event.locals.user = {
          id: payload.sub,
          role: payload.role,
          email: payload.email
        };
      }
    }
  }

  return resolve(event);
};
