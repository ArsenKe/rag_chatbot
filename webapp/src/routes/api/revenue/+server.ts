import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { Decimal } from '@prisma/client/runtime/library';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    // Only admins and managers can access platform revenue
    requireRole(locals.user?.role, ['admin', 'manager']);

    const period = (url.searchParams.get('period') ?? 'month') as 'day' | 'week' | 'month' | 'all' | 'custom';
    const customStartDate = url.searchParams.get('startDate');
    const customEndDate = url.searchParams.get('endDate');
    const skip = parseInt(url.searchParams.get('skip') ?? '0');
    const take = Math.min(parseInt(url.searchParams.get('take') ?? '20'), 100);

    // Calculate date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfDay);
    endOfToday.setDate(endOfToday.getDate() + 1);

    let startDate: Date;
    let endDate: Date = endOfToday;

    switch (period) {
      case 'day':
        startDate = startOfDay;
        break;
      case 'week':
        startDate = new Date(startOfDay);
        const dayOfWeek = startDate.getDay();
        const offsetToMonday = (dayOfWeek + 6) % 7;
        startDate.setDate(startDate.getDate() - offsetToMonday);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          throw error(400, 'Custom date range requires startDate and endDate');
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      default: // 'all'
        startDate = new Date(2020, 0, 1);
    }

    // Fetch aggregated statistics
    const stats = await prisma.trip.aggregate({
      _sum: {
        totalAmount: true,
        platformFee: true,
        driverPayout: true
      },
      _count: true,
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    const totalRevenue = stats._sum.totalAmount ?? new Decimal(0);
    const totalPlatformFee = stats._sum.platformFee ?? new Decimal(0);
    const totalDriverPayout = stats._sum.driverPayout ?? new Decimal(0);
    const completedTripsCount = stats._count;

    // Calculate averages
    const averageFarePerTrip =
      completedTripsCount > 0
        ? new Decimal(totalRevenue).dividedBy(completedTripsCount)
        : new Decimal(0);
    const averagePlatformFeePerTrip =
      completedTripsCount > 0
        ? new Decimal(totalPlatformFee).dividedBy(completedTripsCount)
        : new Decimal(0);

    // Fetch paginated trips for export
    const trips = await prisma.trip.findMany({
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        booking: {
          include: {
            customer: true
          }
        },
        driver: {
          include: {
            user: true
          }
        },
        assignedCar: true
      },
      orderBy: {
        startTime: 'desc'
      },
      skip,
      take
    });

    const tripsFormatted = trips.map(trip => ({
      id: trip.id.toString(),
      startTime: trip.startTime?.toISOString() ?? null,
      endTime: trip.endTime?.toISOString() ?? null,
      customerName: trip.booking?.customer?.name ?? 'Unknown',
      customerPhone: trip.booking?.customer?.phone ?? null,
      driverName: trip.driver?.user?.name ?? 'Unknown',
      driverId: trip.driver?.id.toString() ?? null,
      vehicleInfo: trip.assignedCar ? `${trip.assignedCar.make} ${trip.assignedCar.model}` : null,
      totalAmount: trip.totalAmount?.toString() ?? '0',
      platformFee: trip.platformFee?.toString() ?? '0',
      driverPayout: trip.driverPayout?.toString() ?? '0',
      status: trip.status
    }));

    // Get total trip count for pagination
    const totalTripsCount = await prisma.trip.count({
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    return json({
      summary: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalRevenue: totalRevenue.toString(),
        totalPlatformFee: totalPlatformFee.toString(),
        totalDriverPayout: totalDriverPayout.toString(),
        completedTripsCount,
        averageFarePerTrip: averageFarePerTrip.toString(),
        averagePlatformFeePerTrip: averagePlatformFeePerTrip.toString()
      },
      trips: tripsFormatted,
      pagination: {
        skip,
        take,
        total: totalTripsCount,
        hasMore: skip + take < totalTripsCount
      }
    });
  } catch (err) {
    console.error('Error fetching revenue stats:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to fetch revenue statistics');
  }
};
