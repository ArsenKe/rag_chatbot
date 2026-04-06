import { prisma } from '$lib/server/db/client';
import type { Decimal } from '@prisma/client/runtime/library';

export interface ReportFilters {
  from: Date;
  to: Date;
}

export interface Summary {
  totalRevenue: number;
  tripCount: number;
  avgFare: number;
  avgDuration: number;
}

export interface RevenueDayRow {
  day: string;
  trips: number;
  revenue: number;
}

export interface DriverRow {
  name: string;
  trips: number;
  earnings: number;
  avgDuration: number;
}

export interface CarRow {
  licensePlate: string;
  make: string;
  model: string;
  tripCount: number;
  totalRevenue: number;
}

export interface LocationRow {
  name: string;
  city: string | null;
  pickups: number;
}

export async function getSummary(filters: ReportFilters): Promise<Summary> {
  const result = await prisma.trip.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    _avg: { totalAmount: true, durationMinutes: true },
    where: { startTime: { gte: filters.from, lt: filters.to } }
  });
  return {
    totalRevenue: Number(result._sum.totalAmount ?? 0),
    tripCount: result._count.id,
    avgFare: Number(result._avg.totalAmount ?? 0),
    avgDuration: Math.round(Number(result._avg.durationMinutes ?? 0))
  };
}

export async function getRevenueTrend(filters: ReportFilters): Promise<RevenueDayRow[]> {
  type RawRow = { day: Date; trips: bigint; revenue: Decimal | null };
  const raw = await prisma.$queryRaw<RawRow[]>`
    SELECT DATE_TRUNC('day', "startTime")::date AS day,
           COUNT(*) AS trips,
           SUM("totalAmount") AS revenue
    FROM "Trip"
    WHERE "startTime" >= ${filters.from} AND "startTime" < ${filters.to}
    GROUP BY 1
    ORDER BY 1
  `;
  return raw.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    trips: Number(r.trips),
    revenue: Number(r.revenue ?? 0)
  }));
}

export async function getDriverPerformance(filters: ReportFilters): Promise<DriverRow[]> {
  type RawRow = { name: string; trips: bigint; earnings: Decimal | null; avgDuration: Decimal | null };
  const raw = await prisma.$queryRaw<RawRow[]>`
    SELECT d.name,
           COUNT(t.id) AS trips,
           SUM(t."totalAmount") AS earnings,
           AVG(t."durationMinutes") AS "avgDuration"
    FROM "Trip" t
    JOIN "Driver" d ON t."driverId" = d.id
    WHERE t."startTime" >= ${filters.from} AND t."startTime" < ${filters.to}
    GROUP BY d.id, d.name
    ORDER BY earnings DESC
    LIMIT 10
  `;
  return raw.map((r) => ({
    name: r.name,
    trips: Number(r.trips),
    earnings: Number(r.earnings ?? 0),
    avgDuration: Math.round(Number(r.avgDuration ?? 0))
  }));
}

export async function getCarUtilization(filters: ReportFilters): Promise<CarRow[]> {
  type RawRow = {
    licensePlate: string;
    make: string;
    model: string;
    tripCount: bigint;
    totalRevenue: Decimal | null;
  };
  const raw = await prisma.$queryRaw<RawRow[]>`
    SELECT c."licensePlate", c.make, c.model,
           COUNT(t.id) AS "tripCount",
           SUM(t."totalAmount") AS "totalRevenue"
    FROM "Trip" t
    JOIN "Car" c ON t."carId" = c.id
    WHERE t."startTime" >= ${filters.from} AND t."startTime" < ${filters.to}
    GROUP BY c.id, c."licensePlate", c.make, c.model
    ORDER BY "tripCount" DESC
  `;
  return raw.map((r) => ({
    licensePlate: r.licensePlate,
    make: r.make,
    model: r.model,
    tripCount: Number(r.tripCount),
    totalRevenue: Number(r.totalRevenue ?? 0)
  }));
}

export async function getTopLocations(filters: ReportFilters): Promise<LocationRow[]> {
  type RawRow = { name: string; city: string | null; pickups: bigint };
  const raw = await prisma.$queryRaw<RawRow[]>`
    SELECT l.name, l.city, COUNT(t.id) AS pickups
    FROM "Trip" t
    JOIN "Location" l ON t."pickupLocationId" = l.id
    WHERE t."startTime" >= ${filters.from} AND t."startTime" < ${filters.to}
    GROUP BY l.id, l.name, l.city
    ORDER BY pickups DESC
    LIMIT 10
  `;
  return raw.map((r) => ({
    name: r.name,
    city: r.city,
    pickups: Number(r.pickups)
  }));
}
