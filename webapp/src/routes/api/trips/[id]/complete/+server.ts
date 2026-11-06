import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleTripCompleted } from '$lib/server/trips/trip-event-handler';

/**
 * POST /api/trips/[id]/complete
 * Mark trip as completed, calculate payout, send notifications
 * Requires: driver role or admin
 */
export const POST: RequestHandler = async ({ params, locals }) => {
  try {
    // Verify authentication
    if (!locals.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify role (driver or admin/manager)
    if (!['driver', 'admin', 'manager'].includes(locals.user?.role || '')) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const tripId = BigInt(params.id);

    // Handle trip completed event
    const result = await handleTripCompleted(tripId);

    return json(result);
  } catch (error) {
    console.error('Error completing trip:', error);
    return json(
      { error: 'Failed to complete trip', details: String(error) },
      { status: 500 }
    );
  }
};
