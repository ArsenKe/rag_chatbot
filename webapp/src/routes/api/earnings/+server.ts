import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { failure, success, toErrorResponse } from '$lib/server/api/responses';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);

    if (locals.user?.role !== 'driver') {
      return failure(403, 'forbidden', 'Earnings endpoint is for driver context.');
    }

    if (!locals.user.driverId) {
      return success({
        day: 0,
        week: 0,
        month: 0,
        year: 0
      });
    }

    const driverId = BigInt(locals.user.driverId);
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    const dayOfWeek = startOfWeek.getDay();
    const offsetToMonday = (dayOfWeek + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - offsetToMonday);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [day, week, month, year] = await Promise.all([
      prisma.trip.aggregate({
        _sum: { totalAmount: true },
        where: { driverId, startTime: { gte: startOfDay } }
      }),
      prisma.trip.aggregate({
        _sum: { totalAmount: true },
        where: { driverId, startTime: { gte: startOfWeek } }
      }),
      prisma.trip.aggregate({
        _sum: { totalAmount: true },
        where: { driverId, startTime: { gte: startOfMonth } }
      }),
      prisma.trip.aggregate({
        _sum: { totalAmount: true },
        where: { driverId, startTime: { gte: startOfYear } }
      })
    ]);

    return success({
      day: Number(day._sum.totalAmount ?? 0),
      week: Number(week._sum.totalAmount ?? 0),
      month: Number(month._sum.totalAmount ?? 0),
      year: Number(year._sum.totalAmount ?? 0)
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
