import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager', 'driver']);

  const isDriver = locals.user?.role === 'driver';
  const driverId = locals.user?.driverId ? BigInt(locals.user.driverId) : null;

  if (isDriver && !driverId) {
    return {
      metrics: {
        todayRevenue: 0,
        openBookings: 0,
        activeDrivers: 0
      },
      earnings: {
        day: 0,
        week: 0,
        month: 0,
        year: 0
      },
      recentBookings: []
    };
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const startOfWeek = new Date(startOfDay);
  const dayOfWeek = startOfWeek.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - offsetToMonday);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const tripWhereBase = {
    ...(isDriver && driverId ? { driverId } : {})
  };

  const [todayRevenue, weekRevenue, monthRevenue, yearRevenue, openBookings, activeDrivers, recentBookings] = await Promise.all([
    prisma.trip.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...tripWhereBase,
        startTime: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    }),
    prisma.trip.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...tripWhereBase,
        startTime: {
          gte: startOfWeek
        }
      }
    }),
    prisma.trip.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...tripWhereBase,
        startTime: {
          gte: startOfMonth
        }
      }
    }),
    prisma.trip.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...tripWhereBase,
        startTime: {
          gte: startOfYear
        }
      }
    }),
    prisma.booking.count({
      where: {
        ...(isDriver && driverId
          ? {
              trip: {
                is: { driverId }
              }
            }
          : {}),
        status: {
          in: ['reserved', 'confirmed']
        }
      }
    }),
    prisma.driver.count({
      where: isDriver && driverId ? { id: driverId, status: 'active' } : { status: 'active' }
    }),
    prisma.booking.findMany({
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
        dropoffLocation: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  return {
    metrics: {
      todayRevenue: Number(todayRevenue._sum.totalAmount ?? 0),
      openBookings,
      activeDrivers
    },
    earnings: {
      day: Number(todayRevenue._sum.totalAmount ?? 0),
      week: Number(weekRevenue._sum.totalAmount ?? 0),
      month: Number(monthRevenue._sum.totalAmount ?? 0),
      year: Number(yearRevenue._sum.totalAmount ?? 0)
    },
    recentBookings: recentBookings.map((booking) => ({
      id: booking.id.toString(),
      customer: booking.customer.name,
      pickup: booking.pickupLocation.name,
      dropoff: booking.dropoffLocation.name,
      start: booking.requestedStart.toISOString(),
      status: booking.status
    }))
  };
};