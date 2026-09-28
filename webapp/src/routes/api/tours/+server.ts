import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { tourStartSchema } from '$lib/server/tours/schemas';
import { calculateTourPriceFromDB } from '$lib/server/tours/pricing-config';
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
    
    let pricing;
    try {
      pricing = await calculateTourPriceFromDB(body.tier, body.guestCount);
    } catch (err) {
      return failure(400, 'pricing_config_missing', `Pricing not configured for tier ${body.tier} with ${body.guestCount} guests`);
    }

    const created = await prisma.cityTour.create({
      data: {
        driverId: BigInt(locals.user.driverId),
        tier: body.tier,
        guestCount: body.guestCount,
        language: body.language,
        durationMinutes: pricing.durationMinutes,
        priceAmount: pricing.price.toFixed(2),
        commissionAmount: pricing.commission.toFixed(2),
        status: 'in_progress'
      }
    });

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
