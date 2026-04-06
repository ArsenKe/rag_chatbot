import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { locationSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);
    const body = locationSchema.parse(await request.json());

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        postalCode: body.postalCode || null,
        type: body.type
      }
    });

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);
    await prisma.location.delete({ where: { id } });
    return success({ deleted: true });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
