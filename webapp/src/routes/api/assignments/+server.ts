import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { assignmentSchema } from '$lib/server/api/schemas';
import { success, failure, toErrorResponse } from '$lib/server/api/responses';

async function hasTripConflict(driverId: bigint, carId: bigint, start: Date, end: Date): Promise<boolean> {
  const [driverConflict, carConflict] = await Promise.all([
    prisma.trip.findFirst({
      where: {
        driverId,
        startTime: { lt: end },
        endTime: { gt: start }
      },
      select: { id: true }
    }),
    prisma.trip.findFirst({
      where: {
        carId,
        startTime: { lt: end },
        endTime: { gt: start }
      },
      select: { id: true }
    })
  ]);

  return Boolean(driverConflict || carConflict);
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const body = assignmentSchema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId }
    });

    if (!booking) {
      return failure(404, 'booking_not_found', 'Booking not found.');
    }

    let driverId = body.driverId ?? null;
    let carId = body.carId ?? null;

    if (!driverId || !carId) {
      const availableDriver = await prisma.driverAvailability.findFirst({
        where: {
          isAvailable: true,
          shiftStart: { lte: booking.requestedStart },
          shiftEnd: { gte: booking.requestedEnd },
          driver: { status: 'active' }
        },
        include: { driver: true },
        orderBy: { shiftStart: 'asc' }
      });

      const availableCar = await prisma.car.findFirst({
        where: {
          status: 'available',
          carClass: booking.carClass ?? undefined
        },
        orderBy: { id: 'asc' }
      });

      driverId = driverId ?? availableDriver?.driverId ?? null;
      carId = carId ?? availableCar?.id ?? null;
    }

    if (!driverId || !carId) {
      return failure(400, 'no_assignment_candidate', 'No available driver or car found for requested slot.');
    }

    const conflict = await hasTripConflict(driverId, carId, booking.requestedStart, booking.requestedEnd);
    if (conflict && !body.override) {
      return failure(409, 'assignment_conflict', 'Conflict detected: overlapping trip exists for driver or car.');
    }

    const durationMinutes = Math.max(
      1,
      Math.floor((booking.requestedEnd.getTime() - booking.requestedStart.getTime()) / 60000)
    );

    const created = await prisma.trip.create({
      data: {
        bookingId: booking.id,
        driverId,
        carId,
        customerId: booking.customerId,
        pickupLocationId: booking.pickupLocationId,
        dropoffLocationId: booking.dropoffLocationId,
        startTime: booking.requestedStart,
        endTime: booking.requestedEnd,
        status: 'confirmed',
        durationMinutes,
        fareAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      }
    });

    if (locals.user?.id) {
      await prisma.auditLog.create({
        data: {
          actorUserId: locals.user.id,
          action: body.override ? 'manual_override_assignment' : 'create_assignment',
          entityType: 'trip',
          entityId: created.id.toString(),
          newValue: created as unknown as object
        }
      });
    }

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
