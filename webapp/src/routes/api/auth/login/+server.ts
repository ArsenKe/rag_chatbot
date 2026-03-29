import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { signAuthToken } from '$lib/server/auth/jwt';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json();

  if (!body?.email || !body?.role) {
    return json({ error: 'email and role are required' }, { status: 400 });
  }

  const token = await signAuthToken({
    sub: body.email,
    email: body.email,
    role: body.role
  });

  cookies.set('token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12
  });

  return json({ ok: true });
};
