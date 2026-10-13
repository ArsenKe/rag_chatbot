import { checkAssignmentConflict, updateDriverOperationalStatus } from './conflict-checker';
import { prisma } from '$lib/server/db/client';
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

export interface AssignmentValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestedDrivers?: Array<{ id: BigInt; name: string }>;
}

/**
 * Validates trip assignment
 * Checks:
 * - Trip exists and is in assignable state
 * - Driver is active
 * - No time conflicts
 */
export async function validateTripAssignment(
  tripId: BigInt,
  driverId: BigInt
): Promise<AssignmentValidationResult> {
  try {
    // 1. Check trip exists and is in assignable state
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        driverId: true,
        booking: { select: { id: true } }
      }
    });

    if (!trip) {
      return { isValid: false, error: 'Trip not found' };
    }

    if (trip.status !== 'confirmed' && trip.status !== 'assigned') {
      return { isValid: false, error: `Cannot assign trip with status: ${trip.status}` };
    }

    // Already assigned to another driver?
    if (trip.driverId && trip.driverId !== driverId) {
      return { isValid: false, error: 'Trip already assigned to another driver' };
    }

    // 2. Check driver exists and is active
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, status: true }
    });

    if (!driver) {
      return { isValid: false, error: 'Driver not found' };
    }

    if (driver.status === 'suspended') {
      return { isValid: false, error: 'Driver is suspended' };
    }

    if (driver.status === 'vacation') {
      return { isValid: false, error: 'Driver is on vacation' };
    }

    // 3. Check for time conflicts
    const conflict = await checkAssignmentConflict(driverId, {
      start: trip.startTime,
      end: trip.endTime
    });

    if (conflict.hasConflict) {
      const conflictDetails = conflict.conflicts
        .map(c => `${c.type}: ${c.description}`)
        .join('; ');
      return {
        isValid: false,
        error: `Conflicts found: ${conflictDetails}`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Trip assignment validation error:', error);
    return { isValid: false, error: 'Validation failed: ' + String(error) };
  }
}

/**
 * Validates city tour assignment
 */
export async function validateTourAssignment(
  tourId: BigInt,
  driverId: BigInt
): Promise<AssignmentValidationResult> {
  try {
    // 1. Check tour exists and is in assignable state
    const tour = await prisma.cityTour.findUnique({
      where: { id: tourId },
      select: {
        id: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        startedAt: true,
        durationMinutes: true,
        driverId: true
      }
    });

    if (!tour) {
      return { isValid: false, error: 'Tour not found' };
    }

    if (tour.status !== 'in_progress' && tour.status !== 'completed') {
      return { isValid: false, error: `Cannot reassign tour with status: ${tour.status}` };
    }

    // 2. Check driver exists and is active
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, status: true }
    });

    if (!driver) {
      return { isValid: false, error: 'Driver not found' };
    }

    if (driver.status === 'suspended' || driver.status === 'vacation') {
      return { isValid: false, error: `Driver status is: ${driver.status}` };
    }

    // 3. Check for time conflicts
    const scheduledStart = tour.scheduledStartAt || tour.startedAt;
    const scheduledEnd = tour.scheduledEndAt || new Date(scheduledStart.getTime() + tour.durationMinutes * 60000);

    const conflict = await checkAssignmentConflict(driverId, {
      start: scheduledStart,
      end: scheduledEnd
    });

    if (conflict.hasConflict) {
      const conflictDetails = conflict.conflicts
        .map(c => `${c.type}: ${c.description}`)
        .join('; ');
      return {
        isValid: false,
        error: `Conflicts found: ${conflictDetails}`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Tour assignment validation error:', error);
    return { isValid: false, error: 'Validation failed: ' + String(error) };
  }
}

/**
 * Performs the actual assignment of a trip to a driver
 * Updates both Trip and Driver status
 */
export async function assignTripToDriver(
  tripId: BigInt,
  driverId: BigInt,
  assignedByUserId: string
): Promise<{ success: boolean; error?: string; trip?: any }> {
  try {
    // Validate first
    const validation = await validateTripAssignment(tripId, driverId);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Get trip details for notification
    const tripDetails = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { customerId: true }
    });

    if (!tripDetails) {
      return { success: false, error: 'Trip details not found' };
    }

    // Perform assignment in transaction
    const result = await prisma.$transaction(async tx => {
      // Update trip
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId,
          status: 'assigned'
        }
      });

      // Update driver status
      await updateDriverOperationalStatus(driverId);

      // Log assignment (optional - if you have AuditLog)
      try {
        await tx.auditLog.create({
          data: {
            actorUserId: assignedByUserId,
            action: 'assigned',
            entityType: 'Trip',
            entityId: tripId.toString(),
            newValue: { driverId, status: 'assigned' }
          }
        });
      } catch (e) {
        // AuditLog might not exist yet
      }

      return updatedTrip;
    });

    // Send notification to driver (non-blocking)
    notifyTripEvent(driverId, tripDetails.customerId, tripId, 'assigned').catch(err => {
      console.warn('Failed to send trip assignment notification:', err);
    });

    return { success: true, trip: result };
  } catch (error) {
    console.error('Trip assignment error:', error);
    return { success: false, error: 'Assignment failed: ' + String(error) };
  }
}

/**
 * Performs the actual assignment of a tour to a driver
 */
export async function assignTourToDriver(
  tourId: BigInt,
  driverId: BigInt,
  assignedByUserId: string
): Promise<{ success: boolean; error?: string; tour?: any }> {
  try {
    // Validate first
    const validation = await validateTourAssignment(tourId, driverId);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Perform assignment in transaction
    const result = await prisma.$transaction(async tx => {
      // Update tour
      const updatedTour = await tx.cityTour.update({
        where: { id: tourId },
        data: {
          driverId
        }
      });

      // Update driver status
      await updateDriverOperationalStatus(driverId);

      // Log assignment
      try {
        await tx.auditLog.create({
          data: {
            actorUserId: assignedByUserId,
            action: 'assigned',
            entityType: 'CityTour',
            entityId: tourId.toString(),
            newValue: { driverId }
          }
        });
      } catch (e) {
        // AuditLog might not exist yet
      }

      return updatedTour;
    });

    return { success: true, tour: result };
  } catch (error) {
    console.error('Tour assignment error:', error);
    return { success: false, error: 'Assignment failed: ' + String(error) };
  }
}

/**
 * Rejects a trip assignment (move back to reserved)
 */
export async function rejectTripAssignment(
  tripId: BigInt,
  rejectedByUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async tx => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: { driverId: true }
      });

      if (!trip?.driverId) {
        throw new Error('Trip not currently assigned');
      }

      // Revert trip status and clear driver
      await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId: null,
          status: 'reserved'
        }
      });

      // Update driver status
      if (trip.driverId) {
        await updateDriverOperationalStatus(trip.driverId);
      }

      // Log rejection
      try {
        await tx.auditLog.create({
          data: {
            actorUserId: rejectedByUserId,
            action: 'rejected_assignment',
            entityType: 'Trip',
            entityId: tripId.toString(),
            newValue: { reason }
          }
        });
      } catch (e) {
        // AuditLog might not exist yet
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Trip rejection error:', error);
    return { success: false, error: String(error) };
  }
}
