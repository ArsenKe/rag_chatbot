import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { getDriverEarnings } from '$lib/server/payouts/payout-service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/earnings/driver/:driverId
 * Get driver earnings summary and trip breakdown
 * Query params:
 * - period=month|week|all (default: all)
 * - skip=0
 * - take=20
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const driverId = params.driverId;

    // Verify driver owns this data (can view own earnings, admins can view any)
    const isAdmin = locals.user?.role === 'admin' || locals.user?.role === 'manager';
    const isOwner = locals.user?.id === driverId;

    if (!isAdmin && !isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const period = url.searchParams.get('period') || 'all';
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    // Calculate date range based on period
    let startDate: Date | undefined;
    const now = new Date();

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Parse driverId (might be passed as string UUID for user or BigInt for driver)
    const driver = await db.driver.findFirst({
      where: { userId: driverId }
    });

    if (!driver) {
      return json({ error: 'Driver not found' }, { status: 404 });
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

    return json({
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
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      period
    });
  } catch (error) {
    console.error('Error fetching driver earnings:', error);
    return json(
      { error: 'Failed to fetch earnings', details: String(error) },
      { status: 500 }
    );
  }
};
