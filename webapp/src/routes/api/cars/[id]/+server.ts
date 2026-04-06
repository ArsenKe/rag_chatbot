import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { carSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);
    const body = carSchema.parse(await request.json());

    const updated = await prisma.car.update({
      where: { id },
      data: {
        licensePlate: body.licensePlate,
        model: body.model,
        make: body.make,
        year: body.year,
        seats: body.seats,
        transmission: body.transmission || null,
        fuelType: body.fuelType || null,
        carClass: body.carClass || null,
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
    await prisma.car.delete({ where: { id } });
    return success({ deleted: true });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
