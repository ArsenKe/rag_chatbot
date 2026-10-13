import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/auth/jwt';
import { getDriverEarnings } from '$lib/server/payouts/payout-service';

/**
 * GET /api/drivers/[id]/payouts
 * Get driver earnings and payout information
 * Accessible to: admin, manager, driver (own data)
 * Query params:
 * - startDate=YYYY-MM-DD
 * - endDate=YYYY-MM-DD
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const driverId = BigInt(params.id);

    // Check authorization: admin/manager can view all, drivers can only view their own
    if (
      locals.user.role !== 'admin' &&
      locals.user.role !== 'manager' &&
      locals.user.driverId !== driverId
    ) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) startDate = new Date(startDateStr);
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    }

    const earnings = await getDriverEarnings(driverId, startDate, endDate);

    return json({
      driverId,
      ...earnings
    });
  } catch (error: any) {
    console.error('Error fetching driver earnings:', error);
    return json(
      { error: error.message || 'Failed to fetch earnings', details: String(error) },
      { status: error.statusCode || 500 }
    );
  }
};
