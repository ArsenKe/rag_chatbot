import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { success, failure, toErrorResponse } from '$lib/server/api/responses';
import {
  getSummary,
  getRevenueTrend,
  getDriverPerformance,
  getCarUtilization,
  getTopLocations
} from '$lib/server/reports';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : defaultFrom;
    // include the full to-day by using start of next day
    const to = toParam ? new Date(toParam + 'T23:59:59.999Z') : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return failure(400, 'invalid_date', 'Invalid from or to date parameter');
    }

    const filters = { from, to };

    const [summary, revenueTrend, drivers, cars, locations] = await Promise.all([
      getSummary(filters),
      getRevenueTrend(filters),
      getDriverPerformance(filters),
      getCarUtilization(filters),
      getTopLocations(filters)
    ]);

    return success({
      summary,
      revenueTrend,
      drivers,
      cars,
      locations,
      from: from.toISOString().slice(0, 10),
      to: (toParam ?? now.toISOString().slice(0, 10))
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
