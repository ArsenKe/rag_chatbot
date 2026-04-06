import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { driverSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);
    const body = driverSchema.parse(await request.json());

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        name: body.name,
        licenseNumber: body.licenseNumber,
        phone: body.phone || null,
        hireDate: body.hireDate ? new Date(body.hireDate) : null,
        status: body.status
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
    await prisma.driver.delete({ where: { id } });
    return success({ deleted: true });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
