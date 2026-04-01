import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { carSchema } from '$lib/server/api/schemas';
import { success, toErrorResponse } from '$lib/server/api/responses';

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const status = url.searchParams.get('status');
    const cars = await prisma.car.findMany({
      where: status ? { status: status as 'available' | 'rented' | 'maintenance' } : undefined,
      orderBy: { id: 'desc' }
    });
    return success(cars);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const body = carSchema.parse(await request.json());
    const created = await prisma.car.create({
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

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
