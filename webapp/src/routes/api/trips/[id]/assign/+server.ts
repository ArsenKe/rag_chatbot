import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const POST: RequestHandler = async ({ params, locals, request }) => {
  try {
    // Only managers and admins can assign trips
    requireRole(locals.user?.role, ['manager', 'admin']);

    const tripId = BigInt(params.id);
    const body = await request.json();
    const driverId = BigInt(body.driverId);

    if (!tripId || !driverId) {
      throw error(400, 'Trip ID and Driver ID are required');
    }

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true }
    });

    if (!trip) {
      throw error(404, 'Trip not found');
    }

    // Verify driver exists and is available
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw error(404, 'Driver not found');
    }

    if (driver.status === 'suspended') {
      throw error(400, 'Driver is suspended');
    }

    // Get the user associated with this driver
    const driverUser = await prisma.user.findFirst({
      where: { driverId: driverId }
    });

    // Update trip with driver assignment
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        driverId: driverId,
        status: 'assigned'
      },
      include: {
        driver: true,
        customer: true
      }
    });

    // Create notification for driver
    try {
      if (driverUser) {
        await prisma.notification.create({
          data: {
            userId: driverUser.id,
            type: 'trip_assigned',
            title: 'New Trip Assigned',
            message: `You have been assigned a trip to ${trip.pickupLocationId}`,
            isRead: false
          }
        });
      }
    } catch (notifErr) {
      console.error('Error creating notification:', notifErr);
      // Don't fail the assignment if notification fails
    }

    return json({
      success: true,
      trip: {
        id: updatedTrip.id.toString(),
        status: updatedTrip.status,
        driverId: updatedTrip.driverId.toString(),
        driverName: updatedTrip.driver?.name ?? 'Unknown'
      }
    });
  } catch (err) {
    console.error('Error assigning trip:', err);
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to assign trip');
  }
};
