import type { RequestHandler } from './$types';
import { z } from 'zod';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { success, toErrorResponse } from '$lib/server/api/responses';

const bookingUpdateSchema = z.object({
  status: z.enum(['reserved', 'confirmed', 'completed', 'cancelled']).optional(),
  carClass: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal(''))
});

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);
    const body = bookingUpdateSchema.parse(await request.json());

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        carClass: body.carClass || null,
        notes: body.notes || null
      },
      include: { customer: true, pickupLocation: true, dropoffLocation: true, trip: true }
    });

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

// Soft delete — sets status to cancelled
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    const id = BigInt(params.id);

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    return success(updated);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
