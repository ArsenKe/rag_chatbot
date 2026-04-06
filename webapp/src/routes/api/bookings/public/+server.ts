import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { publicBookingSchema } from '$lib/server/api/schemas';
import { success, failure, toErrorResponse } from '$lib/server/api/responses';

type NotifyResult = {
  status: 'sent' | 'error' | 'skipped';
  message?: string;
  details?: unknown;
};

function toIsoLocal(value: Date) {
  return value.toISOString().slice(0, 16).replace('T', ' ');
}

export const GET: RequestHandler = async () => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, city: true, type: true }
    });

    const pickup = locations.filter((loc) => loc.type === 'pickup' || loc.type === 'both');
    const dropoff = locations.filter((loc) => loc.type === 'dropoff' || loc.type === 'both');

    return success({ pickup, dropoff });
  } catch (cause) {
    return toErrorResponse(cause);
  }
};

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const body = publicBookingSchema.parse(await request.json());

    const [pickup, dropoff] = await Promise.all([
      prisma.location.findUnique({ where: { id: body.pickupLocationId } }),
      prisma.location.findUnique({ where: { id: body.dropoffLocationId } })
    ]);

    if (!pickup || !dropoff) {
      return failure(400, 'invalid_location', 'Pickup and dropoff locations must exist.');
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { phone: body.phone }
    });

    const customer =
      existingCustomer ??
      (await prisma.customer.create({
        data: {
          name: body.name,
          phone: body.phone,
          registrationDate: new Date()
        }
      }));

    const requestedStart = new Date(body.requestedStart);
    const requestedEnd = new Date(requestedStart);
    requestedEnd.setMinutes(requestedEnd.getMinutes() + 60);

    const booking = await prisma.booking.create({
      data: {
        customerId: customer.id,
        pickupLocationId: body.pickupLocationId,
        dropoffLocationId: body.dropoffLocationId,
        requestedStart,
        requestedEnd,
        carClass: body.carClass || null,
        status: 'reserved',
        notes: body.notes || null
      },
      include: {
        customer: true,
        pickupLocation: true,
        dropoffLocation: true
      }
    });

    const base = process.env.SVELTEKIT_API_BASE_URL ?? process.env.FASTAPI_BASE_URL;
    let notifyResult: NotifyResult = {
      status: 'skipped',
      message: 'FastAPI URL is not configured. Booking created without WhatsApp notification.'
    };

    if (base) {
      try {
        const res = await fetch(`${base}/whatsapp/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: customer.phone,
            customer_name: customer.name,
            pickup: booking.pickupLocation.name,
            dropoff: booking.dropoffLocation.name,
            requested_start: toIsoLocal(booking.requestedStart),
            booking_reference: booking.id.toString()
          })
        });

        const payload = await res.json();
        notifyResult = {
          status: payload?.status === 'sent' ? 'sent' : 'error',
          message: payload?.message,
          details: payload
        };
      } catch (cause) {
        notifyResult = {
          status: 'error',
          message: 'Failed to call WhatsApp confirmation endpoint.',
          details: cause instanceof Error ? cause.message : String(cause)
        };
      }
    }

    return success(
      {
        booking,
        notification: notifyResult
      },
      { status: 201 }
    );
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
