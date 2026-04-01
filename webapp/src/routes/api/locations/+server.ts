import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
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