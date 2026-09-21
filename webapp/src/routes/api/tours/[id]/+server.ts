import { z } from 'zod';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';

const tourUpdateSchema = z.object({
  status: z.enum(['completed', 'cancelled'])
});

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);

    if (!locals.user?.driverId) {
      return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
    }

    const id = BigInt(params.id);
    const driverId = BigInt(locals.user.driverId);
    const body = tourUpdateSchema.parse(await request.json());

    const tour = await prisma.cityTour.findUnique({ where: { id } });
    if (!tour || tour.driverId !== driverId) {
      return failure(403, 'forbidden_tour_scope', 'You can only update your own tour.');
    }

    const updated = await prisma.cityTour.update({
      where: { id },
      data: { status: body.status, endedAt: new Date() }
    });

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
