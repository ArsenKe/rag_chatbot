import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager', 'driver']);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [todayRevenue, openBookings, activeDrivers, recentBookings] = await Promise.all([
    prisma.trip.aggregate({
      _sum: { totalAmount: true },
      where: {
        startTime: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    }),
    prisma.booking.count({
      where: {
        status: {
          in: ['reserved', 'confirmed']
        }
      }
    }),
    prisma.driver.count({ where: { status: 'active' } }),
    prisma.booking.findMany({
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