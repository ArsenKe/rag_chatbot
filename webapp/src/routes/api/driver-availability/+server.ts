import { z } from 'zod';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';

const blockSlotSchema = z
  .object({
    shiftStart: z.string().datetime(),
    shiftEnd: z.string().datetime()
  })
  .refine((value) => new Date(value.shiftEnd).getTime() > new Date(value.shiftStart).getTime(), {
    message: 'shiftEnd must be later than shiftStart',
    path: ['shiftEnd']
  });

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);
    if (!locals.user?.driverId) {
      return success({ blockedSlots: [] });
    }

    const driverId = BigInt(locals.user.driverId);
    const [blockedSlots, bookings] = await Promise.all([
      prisma.driverAvailability.findMany({
        where: { driverId },
        orderBy: { shiftStart: 'asc' }
      }),
      prisma.booking.findMany({
        where: { trip: { is: { driverId } } },
        include: {
          customer: true,
          pickupLocation: true,
          dropoffLocation: true,
          trip: {
            include: {
              driver: { select: { name: true } },
              car: { select: { licensePlate: true } }
            }
          }
        },
        orderBy: { requestedStart: 'asc' }
      })
    ]);

    return success({
      blockedSlots: blockedSlots.map((slot) => ({
        id: String(slot.id),
        shiftStart: slot.shiftStart.toISOString(),
        shiftEnd: slot.shiftEnd.toISOString(),
        isAvailable: slot.isAvailable
      })),
      bookings: bookings.map((booking) => ({
        id: String(booking.id),
        status: booking.status,
        requestedStart: booking.requestedStart.toISOString(),
        requestedEnd: booking.requestedEnd.toISOString(),
        customer: booking.customer?.name ?? 'Customer',
        pickup: booking.pickupLocation?.name ?? 'Pickup',
        dropoff: booking.dropoffLocation?.name ?? 'Dropoff',
        driver: booking.trip?.driver?.name ?? 'Driver',
        car: booking.trip?.car?.licensePlate ?? 'Car'
      }))
    });
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

    const body = blockSlotSchema.parse(await request.json());
    const created = await prisma.driverAvailability.create({
      data: {
        driverId: BigInt(locals.user.driverId),
        shiftStart: new Date(body.shiftStart),
        shiftEnd: new Date(body.shiftEnd),
        isAvailable: false
      }
    });

    return success({
      id: String(created.id),
      shiftStart: created.shiftStart.toISOString(),
      shiftEnd: created.shiftEnd.toISOString(),
      isAvailable: created.isAvailable
    }, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);
    const idParam = url.searchParams.get('id');
    if (!idParam) {
      return failure(400, 'missing_block_id', 'Missing block id.');
    }

    if (!locals.user?.driverId) {
      return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
    }

    const blockId = BigInt(idParam);
    const block = await prisma.driverAvailability.findUnique({ where: { id: blockId } });
    if (!block || block.driverId !== BigInt(locals.user.driverId)) {
      return failure(403, 'forbidden_block_scope', 'You can only remove your own unavailable hours.');
    }

    await prisma.driverAvailability.delete({ where: { id: blockId } });
    return success({ deletedId: idParam });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
