import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { bookingSchema } from '$lib/server/api/schemas';
import { success, failure, toErrorResponse } from '$lib/server/api/responses';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        pickupLocation: true,
        dropoffLocation: true,
        trip: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return success(bookings);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const body = bookingSchema.parse(await request.json());
    const [customer, pickup, dropoff] = await Promise.all([
      prisma.customer.findUnique({ where: { id: body.customerId }, select: { id: true } }),
      prisma.location.findUnique({ where: { id: body.pickupLocationId }, select: { id: true } }),
      prisma.location.findUnique({ where: { id: body.dropoffLocationId }, select: { id: true } })
    ]);

    if (!customer || !pickup || !dropoff) {
      return failure(400, 'invalid_relation', 'Customer and locations must exist before creating a booking.');
    }

    const created = await prisma.booking.create({
      data: {
        customerId: body.customerId,
        pickupLocationId: body.pickupLocationId,
        dropoffLocationId: body.dropoffLocationId,
        requestedStart: new Date(body.requestedStart),
        requestedEnd: new Date(body.requestedEnd),
        carClass: body.carClass || null,
        status: body.status,
        notes: body.notes || null
      },
      include: {
        customer: true,
        pickupLocation: true,
        dropoffLocation: true,
        trip: true
      }
    });

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
