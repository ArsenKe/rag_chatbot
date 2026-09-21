import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { tourStartSchema } from '$lib/server/tours/schemas';
import { calculateTourPrice } from '$lib/server/tours/pricing';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);

    if (!locals.user?.driverId) {
      return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
    }

    const driverId = BigInt(locals.user.driverId);
    const tours = await prisma.cityTour.findMany({
      where: { driverId },
      orderBy: { startedAt: 'desc' },
      take: 20
    });

    return success(tours);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);

    if (!locals.user?.driverId) {
      return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
    }

    const body = tourStartSchema.parse(await request.json());
    const { durationMinutes, price, commission } = calculateTourPrice(body.tier, body.guestCount);

    const created = await prisma.cityTour.create({
      data: {
        driverId: BigInt(locals.user.driverId),
        tier: body.tier,
        guestCount: body.guestCount,
        language: body.language,
        durationMinutes,
        priceAmount: price.toFixed(2),
        commissionAmount: commission.toFixed(2),
        status: 'in_progress'
      }
    });

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
