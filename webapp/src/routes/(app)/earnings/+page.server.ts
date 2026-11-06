import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { getDriverEarnings } from '$lib/server/payouts/payout-service';
import { Decimal } from '@prisma/client/runtime/library';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user?.id) {
    throw redirect(307, '/login');
  }

  // Get driver associated with this user
  const driver = await db.driver.findFirst({
    where: { userId: locals.user.id }
  });

  if (!driver) {
    throw Error('Driver profile not found');
  }

  const period = url.searchParams.get('period') || 'all';
  const page = parseInt(url.searchParams.get('page') || '1');
  const skip = (page - 1) * 20;
  const take = 20;

  // Calculate date range
  let startDate: Date | undefined;
  const now = new Date();

  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get earnings summary
  const summary = await getDriverEarnings(driver.id, startDate, now);

  // Get trip breakdown
  const trips = await db.trip.findMany({
    where: {
      driverId: driver.id,
      status: 'completed',
      ...(startDate && {
        startTime: {
          gte: startDate,
          lte: now
        }
      })
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      totalAmount: true,
      platformFee: true,
      driverPayout: true,
      booking: {
        select: {
          id: true,
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          pickupLocation: true,
          dropoffLocation: true
        }
      }
    },
    orderBy: { startTime: 'desc' },
    skip,
    take
  });

  const totalTripsCount = await db.trip.count({
    where: {
      driverId: driver.id,
      status: 'completed',
      ...(startDate && {
        startTime: {
          gte: startDate,
          lte: now
        }
      })
    }
  });

  return {
    driverId: driver.id.toString(),
    userId: locals.user.id,
    earnings: {
      summary: {
        totalTrips: summary.totalTrips,
        totalGrossRevenue: summary.totalGrossRevenue.toString(),
        totalPlatformFees: summary.totalPlatformFees.toString(),
        totalEarnings: summary.totalEarnings.toString(),
        averagePerTrip: summary.averagePerTrip.toString()
      },
      trips: trips.map((trip) => ({
        id: trip.id.toString(),
        startTime: trip.startTime,
        endTime: trip.endTime,
        totalAmount: trip.totalAmount.toString(),
        platformFee: (trip.platformFee || 0).toString(),
        driverPayout: (trip.driverPayout || 0).toString(),
        customerName: trip.booking?.customer
          ? `${trip.booking.customer.firstName} ${trip.booking.customer.lastName}`
          : 'Unknown',
        pickupLocation: trip.booking?.pickupLocation || 'N/A',
        dropoffLocation: trip.booking?.dropoffLocation || 'N/A'
      })),
      totalCount: totalTripsCount,
      page: page,
      pageSize: take,
      period
    }
  };
};
