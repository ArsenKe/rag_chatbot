import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/client';
import { error, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Verify user is authenticated
  if (!locals.user?.id) {
    throw error(401, 'Authentication required');
  }

  // Get customer ID from user
  const customerId = locals.user?.customerId;
  if (!customerId) {
    throw error(403, 'User is not linked to a customer account');
  }

  const status = url.searchParams.get('status') ?? 'all';
  const skip = parseInt(url.searchParams.get('skip') ?? '0');
  const take = 10;
  const sortBy = url.searchParams.get('sortBy') ?? 'recent';

  // Build status filter
  let statusFilter: any = undefined;
  if (status !== 'all') {
    statusFilter = status;
  }

  // Determine sort order
  const orderBy: any = 
    sortBy === 'upcoming' 
      ? { startTime: 'asc' }
      : { startTime: 'desc' };

  // Query bookings/trips for this customer
  const [trips, totalCount] = await Promise.all([
    prisma.trip.findMany({
      where: {
        customerId: BigInt(customerId),
        ...(statusFilter && { status: statusFilter })
      },
      include: {
        driver: true,
        car: true,
        pickupLocation: true,
        dropoffLocation: true,
        booking: true,
        payments: true,
        invoices: true
      },
      orderBy,
      skip,
      take
    }),
    prisma.trip.count({
      where: {
        customerId: BigInt(customerId),
        ...(statusFilter && { status: statusFilter })
      }
    })
  ]);

  // Format trips for display
  const formattedTrips = trips.map(trip => ({
    id: trip.id.toString(),
    status: trip.status,
    startTime: trip.startTime.toISOString(),
    endTime: trip.endTime?.toISOString() ?? null,
    durationMinutes: trip.durationMinutes,
    distanceKm: trip.distanceKm?.toString() ?? null,
    pickupLocation: {
      name: trip.pickupLocation.name,
      address: trip.pickupLocation.address
    },
    dropoffLocation: {
      name: trip.dropoffLocation.name,
      address: trip.dropoffLocation.address
    },
    driver: {
      id: trip.driver.id.toString(),
      name: trip.driver.name ?? 'Unknown',
      phone: trip.driver.phone ?? null,
      rating: trip.driver.rating?.toString() ?? null
    },
    vehicle: {
      make: trip.car.make,
      model: trip.car.model,
      licensePlate: trip.car.licensePlate,
      year: trip.car.year
    },
    pricing: {
      fareAmount: trip.fareAmount.toString(),
      discountAmount: trip.discountAmount.toString(),
      totalAmount: trip.totalAmount.toString(),
      platformFee: trip.platformFee.toString()
    },
    paymentStatus: trip.payments.length > 0 
      ? (trip.payments.some(p => p.status === 'completed') ? 'paid' : 'pending')
      : 'pending',
    hasInvoice: trip.invoices.length > 0,
    reviewStatus: trip.status === 'completed' ? 'pending_review' : null
  }));

  // Get customer info
  const customer = await prisma.customer.findUnique({
    where: { id: BigInt(customerId) },
    include: { user: true }
  });

  return {
    customer: {
      id: customer?.id.toString() ?? '',
      name: customer?.name ?? '',
      email: customer?.email ?? customer?.user?.email ?? '',
      phone: customer?.phone ?? '',
      registrationDate: customer?.registrationDate?.toISOString() ?? null
    },
    trips: formattedTrips,
    pagination: {
      skip,
      take,
      total: totalCount,
      hasMore: skip + take < totalCount
    },
    filters: {
      status: status as 'all' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
      sortBy: sortBy as 'recent' | 'upcoming'
    }
  };
};
