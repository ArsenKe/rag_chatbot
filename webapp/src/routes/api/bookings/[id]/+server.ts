import type { RequestHandler } from './$types';
import { z } from 'zod';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';

const bookingUpdateSchema = z.object({
  status: z.enum(['reserved', 'confirmed', 'completed', 'cancelled']).optional(),
  carClass: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal(''))
});

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);
    const id = BigInt(params.id);
    const body = bookingUpdateSchema.parse(await request.json());

    const isDriver = locals.user?.role === 'driver';

    if (isDriver) {
      if (!locals.user?.driverId) {
        return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
      }

      const driverId = BigInt(locals.user.driverId);
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { trip: true }
      });

      if (!booking || !booking.trip || booking.trip.driverId !== driverId) {
        return failure(403, 'forbidden_booking_scope', 'You can only update your own assigned rides.');
      }

      if (body.status !== 'confirmed' && body.status !== 'cancelled') {
        return failure(400, 'invalid_driver_status', 'Drivers can only accept (confirmed) or cancel rides.');
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.trip.update({
          where: { id: booking.trip!.id },
          data: { status: body.status }
        });

        return tx.booking.update({
          where: { id },
          data: { status: body.status },
          include: {
            customer: true,
            pickupLocation: true,
            dropoffLocation: true,
            trip: {
              include: {
                driver: {
                  select: { name: true }
                },
                car: {
                  select: { licensePlate: true }
                }
              }
            }
          }
        });
      });

      return success(updated);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        carClass: body.carClass || null,
        notes: body.notes || null
      },
      include: { customer: true, pickupLocation: true, dropoffLocation: true, trip: true }
    });

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

// Soft delete — sets status to cancelled
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);
    const id = BigInt(params.id);

    const isDriver = locals.user?.role === 'driver';

    if (isDriver) {
      if (!locals.user?.driverId) {
        return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
      }

      const driverId = BigInt(locals.user.driverId);
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { trip: true }
      });

      if (!booking || !booking.trip || booking.trip.driverId !== driverId) {
        return failure(403, 'forbidden_booking_scope', 'You can only cancel your own assigned rides.');
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.trip.update({
          where: { id: booking.trip!.id },
          data: { status: 'cancelled' }
        });

        return tx.booking.update({
          where: { id },
          data: { status: 'cancelled' }
        });
      });

      return success(updated);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
