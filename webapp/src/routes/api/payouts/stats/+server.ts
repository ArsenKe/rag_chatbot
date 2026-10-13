import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/auth/jwt';
import {
  getDriverEarnings,
  getPlatformRevenue,
  getTopEarners,
  generatePayoutReport
} from '$lib/server/payouts/payout-service';

/**
 * GET /api/payouts/stats
 * Get platform statistics and revenue
 * Accessible to: admin, manager
 * Query params:
 * - startDate=YYYY-MM-DD
 * - endDate=YYYY-MM-DD
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) startDate = new Date(startDateStr);
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999); // End of day
    }

    const stats = await getPlatformRevenue(startDate, endDate);

    return json(stats);
  } catch (error: any) {
    console.error('Error fetching payout stats:', error);
    return json(
      { error: error.message || 'Failed to fetch statistics', details: String(error) },
      { status: error.statusCode || 500 }
    );
  }
};
