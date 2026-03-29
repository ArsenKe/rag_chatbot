import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const GET: RequestHandler = async ({ url, locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const status = url.searchParams.get('status');
  const cars = await prisma.car.findMany({
    where: status ? { status: status as 'available' | 'rented' | 'maintenance' } : undefined,
    orderBy: { id: 'desc' }
  });
  return json({ data: cars });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const body = await request.json();
  const created = await prisma.car.create({
    data: {
      licensePlate: body.licensePlate,
      model: body.model,
      make: body.make,
      year: body.year,
      seats: body.seats,
      transmission: body.transmission,
      fuelType: body.fuelType,
      carClass: body.carClass,
      status: body.status ?? 'available'
    }
  });

  return json({ data: created }, { status: 201 });
};
