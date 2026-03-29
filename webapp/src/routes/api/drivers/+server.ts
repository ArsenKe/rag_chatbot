import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const GET: RequestHandler = async ({ url, locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const status = url.searchParams.get('status');
  const drivers = await prisma.driver.findMany({
    where: status ? { status: status as 'active' | 'inactive' } : undefined,
    orderBy: { id: 'desc' }
  });
  return json({ data: drivers });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const body = await request.json();
  const created = await prisma.driver.create({
    data: {
      name: body.name,
      licenseNumber: body.licenseNumber,
      phone: body.phone,
      hireDate: body.hireDate ? new Date(body.hireDate) : null,
      status: body.status ?? 'active'
    }
  });

  return json({ data: created }, { status: 201 });
};
