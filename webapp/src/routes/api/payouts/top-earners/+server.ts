import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { getTopEarners } from '$lib/server/payouts/payout-service';

/**
 * GET /api/payouts/top-earners
 * Get top earning drivers
 * Accessible to: admin, manager
 * Query params:
 * - limit=10 (default, max 100)
 * - startDate=YYYY-MM-DD (optional)
 * - endDate=YYYY-MM-DD (optional)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const limitStr = url.searchParams.get('limit') || '10';
    const limit = Math.min(Math.max(parseInt(limitStr), 1), 100);

    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) startDate = new Date(startDateStr);
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999); // End of day
    }

    const earners = await getTopEarners(limit, startDate, endDate);

    return json(earners);
  } catch (error: any) {
    console.error('Error fetching top earners:', error);
    return json(
      { error: error.message || 'Failed to fetch top earners', details: String(error) },
      { status: error.statusCode || 500 }
    );
  }
};
