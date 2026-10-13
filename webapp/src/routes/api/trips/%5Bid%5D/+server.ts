import { json } from '@sveltejs/kit';
import { assignTripToDriver, rejectTripAssignment } from '$lib/server/assignments/assignment-validator';
import { prisma } from '$lib/server/db/client';

// POST /api/trips/[id]/assign
export async function POST({ params, request, locals }) {
  try {
    // Check authorization - only manager or admin can assign
    if (!locals.user || (locals.user.role !== 'manager' && locals.user.role !== 'admin')) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { tripId, driverId } = body;

    if (!tripId || !driverId) {
      return json({ error: 'Missing tripId or driverId' }, { status: 400 });
    }

    // Perform assignment with validation
    const result = await assignTripToDriver(BigInt(tripId), BigInt(driverId), locals.user.id);

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json({
      success: true,
      message: 'Trip assigned successfully',
      trip: result.trip
    });
  } catch (error) {
    console.error('Trip assignment error:', error);
    return json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/trips/[id]/assignment - Reject assignment
export async function DELETE({ params, request, locals }) {
  try {
    // Check authorization
    if (!locals.user || (locals.user.role !== 'manager' && locals.user.role !== 'admin')) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { tripId, reason } = body;

    if (!tripId) {
      return json({ error: 'Missing tripId' }, { status: 400 });
    }

    const result = await rejectTripAssignment(BigInt(tripId), locals.user.id, reason);

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json({
      success: true,
      message: 'Assignment rejected'
    });
  } catch (error) {
    console.error('Trip rejection error:', error);
    return json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/trips/[id]/check-driver-availability
// Check if a specific driver can be assigned without conflicts
export async function GET({ params, url, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tripId = params.id;
    const driverId = url.searchParams.get('driverId');

    if (!tripId || !driverId) {
      return json({ error: 'Missing tripId or driverId' }, { status: 400 });
    }

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: BigInt(tripId) },
      select: {
        startTime: true,
        endTime: true,
        status: true
      }
    });

    if (!trip) {
      return json({ error: 'Trip not found' }, { status: 404 });
    }

    // Check if driver is available
    const { checkAssignmentConflict } = await import('$lib/server/assignments/conflict-checker');
    const conflict = await checkAssignmentConflict(BigInt(driverId), {
      start: trip.startTime,
      end: trip.endTime
    });

    return json({
      available: !conflict.hasConflict,
      conflicts: conflict.conflicts
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return json({ error: String(error) }, { status: 500 });
  }
}
