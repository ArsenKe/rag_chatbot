import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { loginSchema } from '$lib/server/api/schemas';
import { success, failure, toErrorResponse } from '$lib/server/api/responses';
import { getSupabaseUserFromAccessToken } from '$lib/server/auth/supabase';
import { signAuthToken } from '$lib/server/auth/jwt';
import { verifyPassword } from '$lib/server/auth/password';
import { HOME_BY_ROLE } from '$lib/rbac/policy';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = loginSchema.parse(await request.json());
    let email: string | undefined;

    if (body.accessToken) {
      const supabaseUser = await getSupabaseUserFromAccessToken(body.accessToken);
      email = supabaseUser?.email?.toLowerCase();

      if (!email) {
        return failure(401, 'invalid_supabase_session', 'Supabase session is invalid or expired.');
      }
    } else {
      email = body.email;
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const userCount = await prisma.user.count();

      if (userCount > 0) {
        return failure(403, 'unknown_user', 'User does not exist. Ask an administrator to create your account.');
      }

      user = await prisma.user.create({
        data: {
          email,
          role: 'admin'
        }
      });
    }

    if (!body.accessToken) {
      if (!user.passwordHash || !body.password || !verifyPassword(body.password, user.passwordHash)) {
        return failure(401, 'invalid_local_credentials', 'Invalid local email or password.');
      }
    }

    if (user.role === 'driver' && !user.driverId) {
      return failure(
        403,
        'driver_mapping_missing',
        'Driver role exists, but no driver profile is linked yet. Ask an admin to link this user to a Driver record.'
      );
    }

    if (body.accessToken) {
      cookies.set('sb-access-token', body.accessToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60
      });
    } else {
      cookies.delete('sb-access-token', { path: '/' });
    }

    const appToken = await signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email
    });

    cookies.set('token', appToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12
    });

    return success({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
      redirectTo: HOME_BY_ROLE[user.role]
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
