import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { bookingSchema } from '$lib/server/api/schemas';
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

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);

    const isDriver = locals.user?.role === 'driver';
    const driverId = locals.user?.driverId ? BigInt(locals.user.driverId) : null;

    if (isDriver && !driverId) {
      return success([]);
    }

    const bookings = await prisma.booking.findMany({
      where: isDriver && driverId
        ? {
            trip: {
              is: { driverId }
            }
          }
        : undefined,
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
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);
    const isDriver = locals.user?.role === 'driver';

    const body = bookingSchema.parse(await request.json());
    const [customer, pickup, dropoff] = await Promise.all([
      prisma.customer.findUnique({ where: { id: body.customerId }, select: { id: true } }),
      prisma.location.findUnique({ where: { id: body.pickupLocationId }, select: { id: true } }),
      prisma.location.findUnique({ where: { id: body.dropoffLocationId }, select: { id: true } })
    ]);

    if (!customer || !pickup || !dropoff) {
      return failure(400, 'invalid_relation', 'Customer and locations must exist before creating a booking.');
    }

    const requestedStart = new Date(body.requestedStart);
    const requestedEnd = new Date(body.requestedEnd);

    if (isDriver) {
      if (!locals.user?.driverId) {
        return failure(403, 'driver_mapping_missing', 'Driver account is missing driver mapping.');
      }

      const driverId = BigInt(locals.user.driverId);
      const selectedCar = body.carId
        ? await prisma.car.findUnique({ where: { id: body.carId }, select: { id: true, status: true, carClass: true } })
        : await prisma.car.findFirst({
            where: {
              status: 'available',
              carClass: body.carClass || undefined
            },
            orderBy: { id: 'asc' },
            select: { id: true, status: true, carClass: true }
          });

      if (!selectedCar) {
        return failure(400, 'car_not_available', 'No available car found for this trip.');
      }

      if (selectedCar.status !== 'available') {
        return failure(409, 'car_not_available', 'Selected car is not available.');
      }

      const conflict = await hasTripConflict(driverId, selectedCar.id, requestedStart, requestedEnd);
      if (conflict) {
        return failure(409, 'assignment_conflict', 'Conflict detected for driver or car in selected time window.');
      }

      const created = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            customerId: body.customerId,
            pickupLocationId: body.pickupLocationId,
            dropoffLocationId: body.dropoffLocationId,
            requestedStart,
            requestedEnd,
            carClass: body.carClass || null,
            status: 'confirmed',
            notes: body.notes || null
          }
        });

        const durationMinutes = Math.max(1, Math.round((requestedEnd.getTime() - requestedStart.getTime()) / 60000));

        await tx.trip.create({
          data: {
            bookingId: booking.id,
            driverId,
            carId: selectedCar.id,
            customerId: body.customerId,
            pickupLocationId: body.pickupLocationId,
            dropoffLocationId: body.dropoffLocationId,
            startTime: requestedStart,
            endTime: requestedEnd,
            status: 'confirmed',
            durationMinutes,
            fareAmount: '0',
            discountAmount: '0',
            totalAmount: '0'
          }
        });

        return tx.booking.findUnique({
          where: { id: booking.id },
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

      return success(created, { status: 201 });
    }

    const created = await prisma.booking.create({
      data: {
        customerId: body.customerId,
        pickupLocationId: body.pickupLocationId,
        dropoffLocationId: body.dropoffLocationId,
        requestedStart,
        requestedEnd,
        carClass: body.carClass || null,
        status: body.status,
        notes: body.notes || null
      },
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

    return success(created, { status: 201 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
