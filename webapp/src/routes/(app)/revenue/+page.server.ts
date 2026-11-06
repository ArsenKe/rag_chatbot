import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { Decimal } from '@prisma/client/runtime/library';

// Force rebuild - v2
export const load: PageServerLoad = async ({ locals, url }) => {
  // Only admins and managers can view platform revenue
  requireRole(locals.user?.role, ['admin', 'manager']);

  const period = (url.searchParams.get('period') ?? 'month') as 'day' | 'week' | 'month' | 'all' | 'custom';
  const customStartDate = url.searchParams.get('startDate');
  const customEndDate = url.searchParams.get('endDate');

  // Calculate date range based on period
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
      startDate = customStartDate ? new Date(customStartDate) : startOfDay;
      endDate = customEndDate ? new Date(customEndDate) : endOfToday;
      break;
    default: // 'all'
      startDate = new Date(2020, 0, 1); // Earliest possible date
  }

  // Query trip statistics
  const [
    totalStats,
    topEarningDrivers,
    recentTrips,
    tripsByService,
    tripsByVehicle,
    hourlyRevenue
  ] = await Promise.all([
    // Total platform commission and metrics
    prisma.trip.aggregate({
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
    }),

    // Top 10 earning drivers this period
    prisma.trip.groupBy({
      by: ['driverId'],
      _sum: {
        driverPayout: true,
        totalAmount: true
      },
      _count: true,
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: {
        _sum: {
          driverPayout: 'desc'
        }
      },
      take: 10
    }),

    // Recent trips (last 10)
    prisma.trip.findMany({
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
        driver: true,
        car: true
      },
      orderBy: {
        endTime: 'desc'
      },
      take: 10
    }),

    // Trips by service type (tour vs regular)
    prisma.trip.groupBy({
      by: ['bookingId'],
      _sum: {
        platformFee: true,
        totalAmount: true
      },
      _count: true,
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lt: endDate
        }
      }
    }),

    // Trips by vehicle type
    prisma.trip.groupBy({
      by: ['carId'],
      _sum: {
        platformFee: true,
        totalAmount: true
      },
      _count: true,
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lt: endDate
        }
      }
    }),

    // Hourly revenue distribution
    prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM "startTime") as hour,
        COUNT(*) as trip_count,
        SUM("platformFee") as platform_fee_total,
        SUM("totalAmount") as revenue_total
      FROM "Trip"
      WHERE 
        status = 'completed'
        AND "startTime" >= ${startDate}
        AND "startTime" < ${endDate}
      GROUP BY EXTRACT(HOUR FROM "startTime")
      ORDER BY hour ASC
    ` as Promise<Array<{
      hour: number;
      trip_count: bigint;
      platform_fee_total: Decimal;
      revenue_total: Decimal;
    }>>
  ]);

  // Fetch driver details for top earners
  const topDriverIds = topEarningDrivers.map(d => d.driverId);
  const driverDetails = await prisma.driver.findMany({
    where: {
      id: {
        in: topDriverIds
      }
    }
  });

  const topEarnersEnriched = topEarningDrivers.map(earnings => {
    const driver = driverDetails.find(d => d.id === earnings.driverId);
    return {
      driverId: earnings.driverId,
      driverName: driver?.name ?? 'Unknown Driver',
      tripsCount: earnings._count,
      totalRevenue: earnings._sum.totalAmount?.toString() ?? '0',
      driverPayout: earnings._sum.driverPayout?.toString() ?? '0',
      averagePerTrip: earnings._sum.driverPayout
        ? new Decimal(earnings._sum.driverPayout).dividedBy(earnings._count).toString()
        : '0'
    };
  });

  // Fetch car details for vehicle types
  const carIds = tripsByVehicle
    .map(v => v.carId)
    .filter(id => id !== null) as bigint[];
  const carDetails = await prisma.car.findMany({
    where: {
      id: {
        in: carIds
      }
    }
  });

  const vehicleBreakdown = tripsByVehicle.map(stats => {
    const car = carDetails.find(c => c.id === stats.carId);
    return {
      carId: stats.carId,
      carName: car ? `${car.make} ${car.model} (${car.licensePlate})` : 'Unknown Vehicle',
      tripsCount: stats._count,
      platformFee: stats._sum.platformFee?.toString() ?? '0',
      revenue: stats._sum.totalAmount?.toString() ?? '0'
    };
  });

  // Calculate summary statistics
  const totalRevenue = totalStats._sum.totalAmount ?? new Decimal(0);
  const totalPlatformFee = totalStats._sum.platformFee ?? new Decimal(0);
  const totalDriverPayout = totalStats._sum.driverPayout ?? new Decimal(0);
  const completedTripsCount = totalStats._count;

  const summary = {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalRevenue: totalRevenue.toString(),
    totalPlatformFee: totalPlatformFee.toString(),
    totalDriverPayout: totalDriverPayout.toString(),
    completedTripsCount,
    averageFarePerTrip:
      completedTripsCount > 0
        ? new Decimal(totalRevenue).dividedBy(completedTripsCount).toString()
        : '0',
    averagePlatformFeePerTrip:
      completedTripsCount > 0
        ? new Decimal(totalPlatformFee).dividedBy(completedTripsCount).toString()
        : '0'
  };

  // Format hourly revenue data for charts
  const hourlyData = hourlyRevenue.map(h => ({
    hour: h.hour,
    trips: Number(h.trip_count),
    platformFee: h.platform_fee_total?.toString() ?? '0',
    revenue: h.revenue_total?.toString() ?? '0'
  }));

  // Format recent trips for display
  const recentTripsFormatted = recentTrips.map(trip => ({
    id: trip.id.toString(),
    startTime: trip.startTime?.toISOString() ?? null,
    endTime: trip.endTime?.toISOString() ?? null,
    customerName: trip.booking?.customer?.name ?? 'Unknown',
    driverName: trip.driver?.name ?? 'Unknown',
    vehicleInfo: trip.car ? `${trip.car.make} ${trip.car.model}` : 'Unknown',
    totalAmount: trip.totalAmount?.toString() ?? '0',
    platformFee: trip.platformFee?.toString() ?? '0',
    driverPayout: trip.driverPayout?.toString() ?? '0',
    status: trip.status
  }));

  return {
    summary,
    topEarners: topEarnersEnriched,
    vehicleBreakdown,
    hourlyData,
    recentTrips: recentTripsFormatted,
    userRole: locals.user?.role
  };
};
