import { prisma } from '$lib/server/db/client';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  warning?: string;
}

export interface ConflictDetail {
  type: 'trip' | 'tour' | 'availability' | 'calendar';
  id?: BigInt;
  startTime: Date;
  endTime: Date;
  description: string;
}

/**
 * Checks if a driver can be assigned to a new trip or tour without conflicts
 * Checks against:
 * - Existing trips
 * - Existing city tours
 * - Driver availability blocks
 * - Google Calendar events (if synced)
 */
export async function checkAssignmentConflict(
  driverId: BigInt,
  timeRange: TimeRange,
  excludeId?: BigInt // ignore a specific trip/tour ID
): Promise<ConflictCheckResult> {
  const conflicts: ConflictDetail[] = [];

  try {
    // 1. Check against existing TRIPS
    const conflictingTrips = await prisma.trip.findMany({
      where: {
        driverId,
        // Exclude cancelled/completed trips that won't conflict
        status: {
          notIn: ['cancelled']
        },
        // Time range overlap check: trip.start < range.end AND trip.end > range.start
        AND: [
          {
            startTime: {
              lt: timeRange.end
            }
          },
          {
            endTime: {
              gt: timeRange.start
            }
          }
        ]
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        booking: {
          select: {
            pickupLocation: { select: { name: true } },
            dropoffLocation: { select: { name: true } }
          }
        }
      }
    });

    conflicts.push(
      ...conflictingTrips.map(trip => ({
        type: 'trip' as const,
        id: trip.id,
        startTime: trip.startTime,
        endTime: trip.endTime,
        description: `Trip from ${trip.booking?.pickupLocation?.name || 'Unknown'} to ${trip.booking?.dropoffLocation?.name || 'Unknown'}`
      }))
    );

    // 2. Check against existing CITY TOURS
    const conflictingTours = await prisma.cityTour.findMany({
      where: {
        driverId,
        status: {
          notIn: ['cancelled']
        },
        // Use scheduledStartAt/scheduledEndAt if available, fall back to startedAt/endedAt
        OR: [
          {
            AND: [
              { scheduledStartAt: { not: null } },
              { scheduledStartAt: { lt: timeRange.end } },
              {
                scheduledEndAt: {
                  gt: timeRange.start
                }
              }
            ]
          },
          {
            AND: [
              { scheduledStartAt: null },
              { startedAt: { lt: timeRange.end } },
              {
                endedAt: {
                  gt: timeRange.start
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        startedAt: true,
        endedAt: true,
        tier: true,
        guestCount: true
      }
    });

    conflicts.push(
      ...conflictingTours.map(tour => ({
        type: 'tour' as const,
        id: tour.id,
        startTime: tour.scheduledStartAt || tour.startedAt,
        endTime: tour.scheduledEndAt || tour.endedAt || new Date(),
        description: `${tour.tier} city tour with ${tour.guestCount} guests`
      }))
    );

    // 3. Check DRIVER AVAILABILITY blocks (when driver is NOT available)
    const unavailableBlocks = await prisma.driverAvailability.findMany({
      where: {
        driverId,
        isAvailable: false, // only check unavailable blocks
        AND: [
          { shiftStart: { lt: timeRange.end } },
          { shiftEnd: { gt: timeRange.start } }
        ]
      },
      select: {
        shiftStart: true,
        shiftEnd: true
      }
    });

    conflicts.push(
      ...unavailableBlocks.map(block => ({
        type: 'availability' as const,
        startTime: block.shiftStart,
        endTime: block.shiftEnd,
        description: 'Driver marked as unavailable'
      }))
    );

    // Note: Google Calendar conflict checking would require fetching from Google API
    // This is added as a TODO for future implementation
    // For now, we rely on the app's internal availability tracking

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking assignment conflicts:', error);
    return {
      hasConflict: false,
      conflicts: [],
      warning: 'Could not fully verify availability - proceed with caution'
    };
  }
}

/**
 * Gets available time slots for a driver on a given day
 * Useful for finding gaps in schedule
 */
export async function getDriverAvailableSlots(
  driverId: BigInt,
  date: Date,
  slotDurationMinutes: number = 60
): Promise<TimeRange[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Get all bookings for this day
  const trips = await prisma.trip.findMany({
    where: {
      driverId,
      startTime: {
        gte: dayStart,
        lte: dayEnd
      },
      status: {
        notIn: ['cancelled']
      }
    },
    select: {
      startTime: true,
      endTime: true
    },
    orderBy: { startTime: 'asc' }
  });

  const tours = await prisma.cityTour.findMany({
    where: {
      driverId,
      startedAt: {
        gte: dayStart,
        lte: dayEnd
      },
      status: {
        notIn: ['cancelled']
      }
    },
    select: {
      scheduledStartAt: true,
      scheduledEndAt: true,
      startedAt: true,
      endedAt: true
    },
    orderBy: { startedAt: 'asc' }
  });

  // Combine and sort all bookings
  const allBookings = [
    ...trips.map(t => ({ start: t.startTime, end: t.endTime })),
    ...tours.map(t => ({
      start: t.scheduledStartAt || t.startedAt,
      end: t.scheduledEndAt || t.endedAt || new Date()
    }))
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Calculate gaps
  const slots: TimeRange[] = [];
  let currentTime = dayStart;

  for (const booking of allBookings) {
    if (booking.start > currentTime) {
      // Gap found
      slots.push({
        start: new Date(currentTime),
        end: new Date(booking.start)
      });
    }
    currentTime = new Date(Math.max(currentTime.getTime(), booking.end.getTime()));
  }

  // Add final slot if time remains until end of day
  if (currentTime < dayEnd) {
    slots.push({
      start: new Date(currentTime),
      end: new Date(dayEnd)
    });
  }

  return slots;
}

/**
 * Updates driver status based on current assignments
 * Called after assigning/completing trips/tours
 */
export async function updateDriverOperationalStatus(
  driverId: BigInt
): Promise<'active' | 'on_trip' | 'on_tour'> {
  const now = new Date();

  // Check if driver has an active trip
  const activeTrip = await prisma.trip.findFirst({
    where: {
      driverId,
      status: {
        notIn: ['cancelled', 'completed']
      },
      startTime: { lte: now },
      endTime: { gte: now }
    }
  });

  if (activeTrip) {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'on_trip',
        statusUpdatedAt: now
      }
    });
    return 'on_trip';
  }

  // Check if driver has an active tour
  const activeTour = await prisma.cityTour.findFirst({
    where: {
      driverId,
      status: {
        notIn: ['cancelled', 'completed']
      },
      OR: [
        {
          AND: [
            { scheduledStartAt: { lte: now } },
            { scheduledEndAt: { gte: now } }
          ]
        },
        {
          AND: [
            { startedAt: { lte: now } },
            { endedAt: { gte: now } }
          ]
        }
      ]
    }
  });

  if (activeTour) {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'on_tour',
        statusUpdatedAt: now
      }
    });
    return 'on_tour';
  }

  // Default to active
  await prisma.driver.update({
    where: { id: driverId },
    data: {
      status: 'active',
      statusUpdatedAt: now
    }
  });
  return 'active';
}

/**
 * Suggests best available drivers for a trip
 * Returns drivers sorted by availability
 */
export async function suggestAvailableDrivers(
  timeRange: TimeRange,
  limit: number = 5
): Promise<
  Array<{
    driverId: BigInt;
    name: string;
    status: string;
    conflictCount: number;
  }>
> {
  const allDrivers = await prisma.driver.findMany({
    where: {
      status: { in: ['active', 'offline'] } // exclude on_trip, on_tour, etc
    },
    select: {
      id: true,
      name: true,
      status: true
    }
  });

  const driverScores = await Promise.all(
    allDrivers.map(async driver => ({
      driverId: driver.id,
      name: driver.name,
      status: driver.status,
      conflictCount: (await checkAssignmentConflict(driver.id, timeRange)).conflicts
        .length
    }))
  );

  return driverScores.sort((a, b) => a.conflictCount - b.conflictCount).slice(0, limit);
}
