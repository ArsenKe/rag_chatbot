import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { appUserInviteSchema } from '$lib/server/api/schemas';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';
import { getSupabaseAdminClient } from '$lib/server/auth/supabase_admin';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const body = appUserInviteSchema.parse(await request.json());
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return failure(
        500,
        'supabase_admin_not_configured',
        'SUPABASE_SERVICE_ROLE_KEY is missing. Configure server env before using invite automation.'
      );
    }

    const redirectTo = process.env.AUTH_INVITE_REDIRECT_TO;
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(body.email, redirectTo ? { redirectTo } : undefined);

    if (error) {
      return failure(400, 'supabase_invite_failed', error.message);
    }

    const mapping = await prisma.user.upsert({
      where: { email: body.email },
      update: { role: body.role },
      create: { email: body.email, role: body.role },
      select: {
        id: true,
        email: true,
        role: true,
        driverId: true,
        createdAt: true
      }
    });

    if (locals.user?.id) {
      await prisma.auditLog.create({
        data: {
          actorUserId: locals.user.id,
          action: 'invite_and_upsert_user_role_mapping',
          entityType: 'user',
          entityId: mapping.id,
          newValue: {
            role: mapping.role,
            email: mapping.email,
            supabaseUserId: data.user?.id ?? null
          }
        }
      });
    }

    return success({
      invited: true,
      supabaseUserId: data.user?.id ?? null,
      user: mapping
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
