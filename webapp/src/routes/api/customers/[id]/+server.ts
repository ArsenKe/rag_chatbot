import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { customerSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);
    const body = customerSchema.parse(await request.json());

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        driverLicense: body.driverLicense || null
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
    await prisma.customer.delete({ where: { id } });
    return success({ deleted: true });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
