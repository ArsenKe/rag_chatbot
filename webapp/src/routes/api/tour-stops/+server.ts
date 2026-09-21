import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { success, toErrorResponse } from '$lib/server/api/responses';

// Default Vienna stops, auto-seeded once so drivers have content without an admin CMS
const DEFAULT_STOPS = [
  { name: 'Hofburg Palace', order: 1 },
  { name: 'Maria Theresia Square', order: 2 },
  { name: 'Parlament', order: 3 },
  { name: 'Rathaus', order: 4 },
  { name: 'Votivkirche', order: 5 },
  { name: 'Michael Square', order: 6 }
];

export const GET: RequestHandler = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);

    const count = await prisma.tourStop.count();
    if (count === 0) {
      await prisma.tourStop.createMany({ data: DEFAULT_STOPS });
    }

    const stops = await prisma.tourStop.findMany({ orderBy: { order: 'asc' } });
    return success(stops);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
