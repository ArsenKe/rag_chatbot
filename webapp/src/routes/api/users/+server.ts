import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { appUserCreateSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        role: true,
        driverId: true,
        createdAt: true
      }
    });

    return success(users);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const body = appUserCreateSchema.parse(await request.json());
    const created = await prisma.user.create({
      data: {
        email: body.email,
        role: body.role
      },
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
          action: 'create_user_role_mapping',
          entityType: 'user',
          entityId: created.id,
          newValue: created as unknown as object
        }
      });
    }

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};