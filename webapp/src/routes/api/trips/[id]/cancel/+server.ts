import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleTripCancelled } from '$lib/server/trips/trip-event-handler';

/**
 * POST /api/trips/[id]/cancel
 * Cancel a trip and send notifications
 * Body: { reason?: string }
 * Requires: driver role or admin
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
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

    // Parse request body
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body provided
    }

    // Handle trip cancelled event
    const result = await handleTripCancelled(tripId, reason);

    return json(result);
  } catch (error) {
    console.error('Error cancelling trip:', error);
    return json(
      { error: 'Failed to cancel trip', details: String(error) },
      { status: 500 }
    );
  }
};
