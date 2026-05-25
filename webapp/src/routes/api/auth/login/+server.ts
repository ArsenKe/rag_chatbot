import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { loginSchema } from '$lib/server/api/schemas';
import { success, failure, toErrorResponse } from '$lib/server/api/responses';
import { getSupabaseUserFromAccessToken } from '$lib/server/auth/supabase';
import { HOME_BY_ROLE } from '$lib/rbac/policy';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = loginSchema.parse(await request.json());
    const supabaseUser = await getSupabaseUserFromAccessToken(body.accessToken);
    const email = supabaseUser?.email?.toLowerCase();

    if (!email) {
      return failure(401, 'invalid_supabase_session', 'Supabase session is invalid or expired.');
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

    if (user.role === 'driver' && !user.driverId) {
      return failure(
        403,
        'driver_mapping_missing',
        'Driver role exists, but no driver profile is linked yet. Ask an admin to link this user to a Driver record.'
      );
    }

    cookies.set('sb-access-token', body.accessToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60
    });

    cookies.delete('token', { path: '/' });

    return success({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
      redirectTo: HOME_BY_ROLE[user.role]
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
