import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  // Only managers and admins can access dispatch dashboard
  requireRole(locals.user?.role, ['manager', 'admin']);

  // Fetch all driver data
  const [
    availableDrivers,
    driversOnTrip,
    pendingTrips,
    activeTrips,
    todayCompletedTrips,
    allLocations
  ] = await Promise.all([
    // Available drivers (active status, not on trip)
    prisma.driver.findMany({
      where: {
        status: 'active'
      },
      include: {
        user: true,
        trips: {
          where: {
            status: 'in_progress'
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    }),

    // Drivers currently on a trip
    prisma.driver.findMany({
      where: {
        status: 'on_trip'
      },
      include: {
        user: true,
        trips: {
          where: {
            status: 'in_progress'
          },
          include: {
            booking: true,
            car: true,
            pickupLocation: true,
            dropoffLocation: true,
            customer: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    }),

    // Pending trips awaiting assignment
    prisma.trip.findMany({
      where: {
        status: 'confirmed',
        driverId: { not: 0 } // Placeholder check; should refactor to NOT NULL in schema
      },
      include: {
        booking: true,
        car: true,
        customer: {
          include: {
            user: true
          }
        },
        pickupLocation: true,
        dropoffLocation: true,
        driver: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    }),

    // Currently active trips (in_progress)
    prisma.trip.findMany({
      where: {
        status: 'in_progress'
      },
      include: {
        booking: true,
        car: true,
        customer: {
          include: {
            user: true
          }
        },
        pickupLocation: true,
        dropoffLocation: true,
        driver: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 20
    }),

    // Completed trips today
    (() => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      return prisma.trip.findMany({
        where: {
          status: 'completed',
          endTime: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        include: {
          driver: {
            include: {
              user: true
            }
          },
          customer: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          endTime: 'desc'
        },
        take: 10
      });
    })(),

    // All pickup/dropoff locations for filtering
    prisma.location.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        city: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  ]);

  // Format available drivers for display
  const formattedAvailableDrivers = availableDrivers.map(driver => ({
    id: driver.id.toString(),
    name: driver.user?.name ?? 'Unknown',
    phone: driver.user?.phone ?? null,
    email: driver.user?.email ?? null,
    status: driver.status,
    rating: driver.rating?.toString() ?? null,
    acceptedTripsCount: driver.acceptedTripsCount,
    cancelledTripsCount: driver.cancelledTripsCount,
    activeTripsCount: driver.trips.length
  }));

  // Format drivers currently on trip
  const formattedDriversOnTrip = driversOnTrip.map(driver => ({
    id: driver.id.toString(),
    name: driver.user?.name ?? 'Unknown',
    phone: driver.user?.phone ?? null,
    status: driver.status,
    currentTrip: driver.trips.length > 0 ? {
      id: driver.trips[0]?.id.toString() ?? null,
      customerId: driver.trips[0]?.customer?.id.toString() ?? null,
      customerName: driver.trips[0]?.customer?.name ?? 'Unknown',
      customerPhone: driver.trips[0]?.customer?.phone ?? null,
      pickupLocation: driver.trips[0]?.pickupLocation?.name ?? null,
      dropoffLocation: driver.trips[0]?.dropoffLocation?.name ?? null,
      startTime: driver.trips[0]?.startTime?.toISOString() ?? null,
      estimatedDuration: driver.trips[0]?.durationMinutes ?? 0
    } : null
  }));

  // Format pending trips
  const formattedPendingTrips = pendingTrips.map(trip => ({
    id: trip.id.toString(),
    status: trip.status,
    requestedStart: trip.booking?.requestedStart?.toISOString() ?? trip.startTime?.toISOString() ?? null,
    requestedEnd: trip.booking?.requestedEnd?.toISOString() ?? trip.endTime?.toISOString() ?? null,
    customerName: trip.customer?.name ?? 'Unknown',
    customerPhone: trip.customer?.phone ?? null,
    customerEmail: trip.customer?.user?.email ?? null,
    pickupLocation: {
      id: trip.pickupLocation?.id.toString() ?? null,
      name: trip.pickupLocation?.name ?? 'Unknown',
      address: trip.pickupLocation?.address ?? null
    },
    dropoffLocation: {
      id: trip.dropoffLocation?.id.toString() ?? null,
      name: trip.dropoffLocation?.name ?? 'Unknown',
      address: trip.dropoffLocation?.address ?? null
    },
    carClass: trip.booking?.carClass ?? null,
    durationMinutes: trip.durationMinutes,
    distanceKm: trip.distanceKm?.toString() ?? null,
    totalAmount: trip.totalAmount?.toString() ?? '0',
    notes: trip.booking?.notes ?? null,
    assignedDriver: trip.driver ? {
      id: trip.driver.id.toString(),
      name: trip.driver.user?.name ?? 'Unknown'
    } : null
  }));

  // Format active trips
  const formattedActiveTrips = activeTrips.map(trip => ({
    id: trip.id.toString(),
    status: trip.status,
    startTime: trip.startTime?.toISOString() ?? null,
    estimatedEndTime: trip.endTime?.toISOString() ?? null,
    durationMinutes: trip.durationMinutes,
    customerName: trip.customer?.name ?? 'Unknown',
    customerPhone: trip.customer?.phone ?? null,
    driverName: trip.driver?.user?.name ?? 'Unknown',
    driverId: trip.driver?.id.toString() ?? null,
    vehicleInfo: `${trip.car?.make} ${trip.car?.model} (${trip.car?.licensePlate})`,
    pickupLocation: trip.pickupLocation?.name ?? 'Unknown',
    dropoffLocation: trip.dropoffLocation?.name ?? 'Unknown',
    progressPercent: calculateProgress(trip.startTime, trip.endTime, trip.durationMinutes)
  }));

  // Format completed trips
  const formattedCompletedTrips = todayCompletedTrips.map(trip => ({
    id: trip.id.toString(),
    endTime: trip.endTime?.toISOString() ?? null,
    customerName: trip.customer?.name ?? 'Unknown',
    driverName: trip.driver?.user?.name ?? 'Unknown',
    totalAmount: trip.totalAmount?.toString() ?? '0',
    platformFee: trip.platformFee?.toString() ?? '0',
    driverPayout: trip.driverPayout?.toString() ?? '0'
  }));

  // Statistics
  const stats = {
    totalAvailableDrivers: formattedAvailableDrivers.length,
    driversOnTrip: formattedDriversOnTrip.length,
    pendingTripsCount: formattedPendingTrips.length,
    activeTripsCount: formattedActiveTrips.length,
    completedTodayCount: formattedCompletedTrips.length
  };

  return {
    stats,
    availableDrivers: formattedAvailableDrivers,
    driversOnTrip: formattedDriversOnTrip,
    pendingTrips: formattedPendingTrips,
    activeTrips: formattedActiveTrips,
    completedTripsToday: formattedCompletedTrips,
    locations: allLocations
  };
};

// Helper function to calculate trip progress percentage
function calculateProgress(startTime: Date | null, endTime: Date | null, durationMinutes: number): number {
  if (!startTime || !endTime || !durationMinutes) return 0;
  
  const now = new Date();
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const nowMs = now.getTime();
  
  if (nowMs <= startMs) return 0;
  if (nowMs >= endMs) return 100;
  
  const progress = ((nowMs - startMs) / (endMs - startMs)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
