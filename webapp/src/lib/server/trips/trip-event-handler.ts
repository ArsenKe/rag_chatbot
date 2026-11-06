import { db } from '$lib/server/db/client';
import {
  createNotification,
  notifyTripEvent,
  notifyPaymentReceived
} from '$lib/server/notifications/notification-service';
import { calculateAndUpdateTripPayout } from '$lib/server/payouts/payout-service';

/**
 * Trip event handler service
 * Manages trip lifecycle events and triggers notifications
 */

/**
 * Handle trip started event
 * - Update trip status to in_progress
 * - Notify customer that trip has started
 * - Update driver status to on_trip
 */
export async function handleTripStarted(tripId: bigint): Promise<any> {
  try {
    console.log(`[Event] Trip started: ${tripId}`);

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        customerId: true,
        booking: {
          select: {
            customer: {
              select: {
                userId: true
              }
            }
          }
        },
        driver: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    // Update trip status
    const updated = await db.trip.update({
      where: { id: tripId },
      data: {
        status: 'in_progress',
        startTime: new Date()
      }
    });

    // Update driver status
    await db.driver.update({
      where: { id: trip.driverId },
      data: { status: 'on_trip' }
    });

    // Send notification to customer (non-blocking)
    try {
      if (trip.booking?.customer?.userId) {
        await notifyTripEvent(
          trip.driverId,
          trip.customerId,
          tripId,
          'trip_started'
        );
      }
    } catch (err) {
      console.error('Error sending trip started notification:', err);
      // Don't throw - notifications shouldn't block trip operations
    }

    return updated;
  } catch (error) {
    console.error('Error handling trip started:', error);
    throw error;
  }
}

/**
 * Handle trip completed event
 * - Update trip status to completed
 * - Calculate and store payout
 * - Notify driver about payment
 * - Update driver status back to active
 */
export async function handleTripCompleted(tripId: bigint): Promise<any> {
  try {
    console.log(`[Event] Trip completed: ${tripId}`);

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        customerId: true,
        totalAmount: true,
        booking: {
          select: {
            customer: {
              select: {
                userId: true
              }
            }
          }
        },
        driver: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    // Update trip status
    const updated = await db.trip.update({
      where: { id: tripId },
      data: {
        status: 'completed',
        endTime: new Date()
      }
    });

    // Calculate and update payout (20% platform fee, 80% driver payout)
    try {
      await calculateAndUpdateTripPayout(tripId, 20);
      console.log(`[Payout] Calculated for trip ${tripId}`);
    } catch (err) {
      console.error('Error calculating payout:', err);
      // Don't throw - allow trip to complete even if payout calc fails
    }

    // Notify driver about payment (non-blocking)
    try {
      await notifyPaymentReceived(trip.customerId, tripId, trip.totalAmount);
      console.log(`[Notification] Payment notification sent for trip ${tripId}`);
    } catch (err) {
      console.error('Error sending payment notification:', err);
    }

    // Update driver status back to active
    try {
      await db.driver.update({
        where: { id: trip.driverId },
        data: { status: 'active' }
      });
    } catch (err) {
      console.error('Error updating driver status:', err);
    }

    return updated;
  } catch (error) {
    console.error('Error handling trip completed:', error);
    throw error;
  }
}

/**
 * Handle trip cancelled event
 * - Update trip status to cancelled
 * - Notify both driver and customer
 * - Update driver status back to active
 */
export async function handleTripCancelled(tripId: bigint, reason?: string): Promise<any> {
  try {
    console.log(`[Event] Trip cancelled: ${tripId}, reason: ${reason || 'unknown'}`);

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        customerId: true,
        booking: {
          select: {
            customer: {
              select: {
                userId: true
              }
            }
          }
        },
        driver: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    // Update trip status
    const updated = await db.trip.update({
      where: { id: tripId },
      data: {
        status: 'cancelled'
      }
    });

    // Send cancellation notification to customer (non-blocking)
    try {
      if (trip.booking?.customer?.userId) {
        await createNotification({
          userId: trip.booking.customer.userId,
          type: 'trip_cancelled',
          title: 'Trip Cancelled',
          message: reason || 'Your trip has been cancelled'
        });
      }
    } catch (err) {
      console.error('Error sending cancellation notification to customer:', err);
    }

    // Update driver status back to active
    try {
      await db.driver.update({
        where: { id: trip.driverId },
        data: { status: 'active' }
      });
    } catch (err) {
      console.error('Error updating driver status:', err);
    }

    return updated;
  } catch (error) {
    console.error('Error handling trip cancelled:', error);
    throw error;
  }
}

/**
 * Handle tour started event
 * - Update trip status to in_progress
 * - Notify guests
 */
export async function handleTourStarted(tripId: bigint): Promise<any> {
  try {
    console.log(`[Event] Tour started: ${tripId}`);

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        customerId: true
      }
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    const updated = await db.trip.update({
      where: { id: tripId },
      data: {
        status: 'in_progress',
        startTime: new Date()
      }
    });

    // Send notification (non-blocking)
    try {
      await notifyTripEvent(
        trip.driverId,
        trip.customerId,
        tripId,
        'tour_started'
      );
    } catch (err) {
      console.error('Error sending tour started notification:', err);
    }

    return updated;
  } catch (error) {
    console.error('Error handling tour started:', error);
    throw error;
  }
}

/**
 * Handle tour completed event
 * - Update trip status to completed
 * - Calculate payout
 * - Notify guests and driver
 */
export async function handleTourCompleted(tripId: bigint): Promise<any> {
  try {
    console.log(`[Event] Tour completed: ${tripId}`);

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        customerId: true,
        totalAmount: true
      }
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    const updated = await db.trip.update({
      where: { id: tripId },
      data: {
        status: 'completed',
        endTime: new Date()
      }
    });

    // Calculate payout
    try {
      await calculateAndUpdateTripPayout(tripId, 20);
    } catch (err) {
      console.error('Error calculating payout:', err);
    }

    // Send notifications
    try {
      await notifyTripEvent(
        trip.driverId,
        trip.customerId,
        tripId,
        'tour_completed'
      );
      await notifyPaymentReceived(trip.customerId, tripId, trip.totalAmount);
    } catch (err) {
      console.error('Error sending tour completion notifications:', err);
    }

    return updated;
  } catch (error) {
    console.error('Error handling tour completed:', error);
    throw error;
  }
}
