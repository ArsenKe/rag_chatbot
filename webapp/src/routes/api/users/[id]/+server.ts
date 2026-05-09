import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { appUserUpdateSchema } from '$lib/server/api/schemas';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';

async function isLastAdmin(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (target?.role !== 'admin') {
    return false;
  }

  const adminCount = await prisma.user.count({ where: { role: 'admin' } });
  return adminCount <= 1;
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const body = appUserUpdateSchema.parse(await request.json());
    const targetId = params.id;

    if (locals.user?.id === targetId && body.role !== 'admin') {
      return failure(400, 'self_role_change_blocked', 'You cannot remove your own admin role.');
    }

    if (body.role !== 'admin' && (await isLastAdmin(targetId))) {
      return failure(400, 'last_admin_blocked', 'At least one admin must remain assigned.');
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, role: true, driverId: true, createdAt: true }
    });

    if (!existing) {
      return failure(404, 'user_not_found', 'User not found.');
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
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
          action: 'update_user_role_mapping',
          entityType: 'user',
          entityId: updated.id,
          oldValue: existing as unknown as object,
          newValue: updated as unknown as object
        }
      });
    }

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const targetId = params.id;
    if (locals.user?.id === targetId) {
      return failure(400, 'self_delete_blocked', 'You cannot delete your own access mapping.');
    }

    if (await isLastAdmin(targetId)) {
      return failure(400, 'last_admin_blocked', 'At least one admin must remain assigned.');
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, role: true, driverId: true, createdAt: true }
    });

    if (!existing) {
      return failure(404, 'user_not_found', 'User not found.');
    }

    await prisma.user.delete({ where: { id: targetId } });

    if (locals.user?.id) {
      await prisma.auditLog.create({
        data: {
          actorUserId: locals.user.id,
          action: 'delete_user_role_mapping',
          entityType: 'user',
          entityId: existing.id,
          oldValue: existing as unknown as object
        }
      });
    }

    return success({ deleted: true });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};