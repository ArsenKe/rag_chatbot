import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const GET: RequestHandler = async ({ locals, url }) => {
  requireRole(locals.user?.role, ['admin', 'manager']);

  const reportType = url.searchParams.get('type') ?? 'revenue_daily';

  if (reportType === 'revenue_daily') {
    const data = await prisma.$queryRawUnsafe(`
      SELECT d."fullDate"::date AS day, SUM(f."totalAmount") AS revenue
      FROM "FactTrip" f
      JOIN "DimDate" d ON f."dateId" = d."dateId"
      GROUP BY d.full_date
      ORDER BY d.full_date DESC
      LIMIT 30;
    `);
    return json({ type: reportType, data });
  }

  if (reportType === 'driver_performance') {
    const data = await prisma.$queryRawUnsafe(`
      SELECT dd.name, COUNT(f."tripId") AS trips, SUM(f."totalAmount") AS earnings
      FROM "FactTrip" f
      JOIN "DimDriver" dd ON f."driverId" = dd."driverId"
      GROUP BY dd.name
      ORDER BY earnings DESC;
    `);
    return json({ type: reportType, data });
  }

  if (reportType === 'car_utilization') {
    const data = await prisma.$queryRawUnsafe(`
      SELECT dc.license_plate, COUNT(f."tripId") AS trip_count
      FROM "FactTrip" f
      JOIN "DimCar" dc ON f."carId" = dc."carId"
      GROUP BY dc.license_plate
      ORDER BY trip_count DESC;
    `);
    return json({ type: reportType, data });
  }

  if (reportType === 'top_locations') {
    const data = await prisma.$queryRawUnsafe(`
      SELECT dl.name, COUNT(*) AS pickups
      FROM "FactTrip" f
      JOIN "DimLocation" dl ON f."pickupLocationId" = dl."locationId"
      GROUP BY dl.name
      ORDER BY pickups DESC
      LIMIT 10;
    `);
    return json({ type: reportType, data });
  }

  return json({ error: 'Unsupported report type' }, { status: 400 });
};
