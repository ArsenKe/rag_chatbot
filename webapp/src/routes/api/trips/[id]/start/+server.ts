import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleTripStarted } from '$lib/server/trips/trip-event-handler';

/**
 * POST /api/trips/[id]/start
 * Mark trip as in_progress and trigger started event
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

    // Handle trip started event
    const result = await handleTripStarted(tripId);

    return json(result);
  } catch (error) {
    console.error('Error starting trip:', error);
    return json(
      { error: 'Failed to start trip', details: String(error) },
      { status: 500 }
    );
  }
};
