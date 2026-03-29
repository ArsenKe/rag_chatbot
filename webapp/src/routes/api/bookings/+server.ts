import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const GET: RequestHandler = async ({ locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const bookings = await prisma.booking.findMany({
    include: {
      customer: true,
      pickupLocation: true,
      dropoffLocation: true,
      trip: true
    },
    orderBy: { createdAt: 'desc' }
  });
  return json({ data: bookings });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const body = await request.json();

  const created = await prisma.booking.create({
    data: {
      customerId: BigInt(body.customerId),
      pickupLocationId: BigInt(body.pickupLocationId),
      dropoffLocationId: BigInt(body.dropoffLocationId),
      requestedStart: new Date(body.requestedStart),
      requestedEnd: new Date(body.requestedEnd),
      carClass: body.carClass,
      status: body.status ?? 'reserved',
      notes: body.notes
    }
  });

  return json({ data: created }, { status: 201 });
};
