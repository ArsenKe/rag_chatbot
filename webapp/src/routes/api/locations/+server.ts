import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { locationSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const locations = await prisma.location.findMany({
      orderBy: [{ city: 'asc' }, { name: 'asc' }]
    });

    return success(locations);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const body = locationSchema.parse(await request.json());
    const created = await prisma.location.create({
      data: {
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        postalCode: body.postalCode || null,
        type: body.type
      }
    });

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};