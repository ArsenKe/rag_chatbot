import { prisma } from '$lib/server/db/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface PayoutCalculation {
  fareAmount: Decimal;
  platformFeePercentage: number; // e.g., 20 for 20%
  platformFee: Decimal;
  driverPayout: Decimal;
}

/**
 * Calculates payout breakdown for a trip
 * @param fareAmount - The total fare amount
 * @param platformFeePercentage - Platform commission percentage (default 20%)
 * @returns Breakdown of platform fee and driver payout
 */
export function calculatePayout(
  fareAmount: Decimal | number,
  platformFeePercentage: number = 20
): PayoutCalculation {
  const fare = new Decimal(fareAmount);
  const percentage = new Decimal(platformFeePercentage).dividedBy(100);
  
  const platformFee = fare.times(percentage);
  const driverPayout = fare.minus(platformFee);

  return {
    fareAmount: fare,
    platformFeePercentage,
    platformFee,
    driverPayout
  };
}

/**
 * Updates trip with calculated payout amounts
 */
export async function calculateAndUpdateTripPayout(
  tripId: BigInt,
  platformFeePercentage: number = 20
): Promise<any> {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        totalAmount: true
      }
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    const payout = calculatePayout(trip.totalAmount, platformFeePercentage);

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        platformFee: payout.platformFee,
        driverPayout: payout.driverPayout
      }
    });

    return updated;
  } catch (error) {
    console.error('Error calculating trip payout:', error);
    throw error;
  }
}

/**
 * Gets driver earnings for a time period
 */
export async function getDriverEarnings(
  driverId: BigInt,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTrips: number;
  totalGrossRevenue: Decimal;
  totalPlatformFees: Decimal;
  totalEarnings: Decimal;
  averagePerTrip: Decimal;
}> {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        driverId,
        status: {
          in: ['completed']
        },
        ...(startDate || endDate) && {
          startTime: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          }
        }
      },
      select: {
        totalAmount: true,
        platformFee: true,
        driverPayout: true
      }
    });

    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalGrossRevenue: new Decimal(0),
        totalPlatformFees: new Decimal(0),
        totalEarnings: new Decimal(0),
        averagePerTrip: new Decimal(0)
      };
    }

    const totalGrossRevenue = trips.reduce(
      (sum, t) => sum.plus(t.totalAmount),
      new Decimal(0)
    );
    const totalPlatformFees = trips.reduce(
      (sum, t) => sum.plus(t.platformFee || 0),
      new Decimal(0)
    );
    const totalEarnings = trips.reduce(
      (sum, t) => sum.plus(t.driverPayout || 0),
      new Decimal(0)
    );
    const averagePerTrip = trips.length > 0 ? totalEarnings.dividedBy(trips.length) : new Decimal(0);

    return {
      totalTrips: trips.length,
      totalGrossRevenue,
      totalPlatformFees,
      totalEarnings,
      averagePerTrip
    };
  } catch (error) {
    console.error('Error calculating driver earnings:', error);
    throw error;
  }
}

/**
 * Gets platform revenue for a time period
 */
export async function getPlatformRevenue(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTrips: number;
  totalGrossRevenue: Decimal;
  totalPlatformFees: Decimal;
  totalDriverPayouts: Decimal;
  platformMarginPercent: number;
}> {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        status: {
          in: ['completed']
        },
        ...(startDate || endDate) && {
          startTime: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          }
        }
      },
      select: {
        totalAmount: true,
        platformFee: true,
        driverPayout: true
      }
    });

    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalGrossRevenue: new Decimal(0),
        totalPlatformFees: new Decimal(0),
        totalDriverPayouts: new Decimal(0),
        platformMarginPercent: 0
      };
    }

    const totalGrossRevenue = trips.reduce(
      (sum, t) => sum.plus(t.totalAmount),
      new Decimal(0)
    );
    const totalPlatformFees = trips.reduce(
      (sum, t) => sum.plus(t.platformFee || 0),
      new Decimal(0)
    );
    const totalDriverPayouts = trips.reduce(
      (sum, t) => sum.plus(t.driverPayout || 0),
      new Decimal(0)
    );

    const platformMarginPercent = totalGrossRevenue.greaterThan(0)
      ? Number(totalPlatformFees.dividedBy(totalGrossRevenue).times(100))
      : 0;

    return {
      totalTrips: trips.length,
      totalGrossRevenue,
      totalPlatformFees,
      totalDriverPayouts,
      platformMarginPercent
    };
  } catch (error) {
    console.error('Error calculating platform revenue:', error);
    throw error;
  }
}

/**
 * Gets top earning drivers
 */
export async function getTopEarners(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    driverId: BigInt;
    driverName: string;
    totalTrips: number;
    totalEarnings: Decimal;
    averagePerTrip: Decimal;
  }>
> {
  try {
    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
        name: true,
        trips: {
          where: {
            status: 'completed',
            ...(startDate || endDate) && {
              startTime: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate })
              }
            }
          },
          select: {
            driverPayout: true
          }
        }
      },
      orderBy: {
        trips: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return drivers
      .map(driver => {
        const totalEarnings = driver.trips.reduce(
          (sum, t) => sum.plus(t.driverPayout || 0),
          new Decimal(0)
        );
        const averagePerTrip = driver.trips.length > 0
          ? totalEarnings.dividedBy(driver.trips.length)
          : new Decimal(0);

        return {
          driverId: driver.id,
          driverName: driver.name,
          totalTrips: driver.trips.length,
          totalEarnings,
          averagePerTrip
        };
      })
      .sort((a, b) => b.totalEarnings.comparedTo(a.totalEarnings));
  } catch (error) {
    console.error('Error fetching top earners:', error);
    throw error;
  }
}

/**
 * Generates a payout report for accounting
 */
export async function generatePayoutReport(startDate: Date, endDate: Date): Promise<any> {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        status: 'completed',
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Group by driver
    const byDriver: Record<string, any> = {};

    trips.forEach(trip => {
      const driverId = trip.driver.id.toString();
      if (!byDriver[driverId]) {
        byDriver[driverId] = {
          driverId: trip.driver.id,
          driverName: trip.driver.name,
          driverPhone: trip.driver.phone,
          trips: [],
          totalGrossRevenue: new Decimal(0),
          totalPlatformFees: new Decimal(0),
          totalPayout: new Decimal(0)
        };
      }

      byDriver[driverId].trips.push({
        tripId: trip.id,
        date: trip.startTime,
        grossRevenue: trip.totalAmount,
        platformFee: trip.platformFee || 0,
        driverPayout: trip.driverPayout || 0
      });

      byDriver[driverId].totalGrossRevenue = byDriver[driverId].totalGrossRevenue.plus(
        trip.totalAmount
      );
      byDriver[driverId].totalPlatformFees = byDriver[driverId].totalPlatformFees.plus(
        trip.platformFee || 0
      );
      byDriver[driverId].totalPayout = byDriver[driverId].totalPayout.plus(trip.driverPayout || 0);
    });

    return {
      reportPeriod: { startDate, endDate },
      driverPayouts: Object.values(byDriver),
      summary: {
        totalTrips: trips.length,
        totalGrossRevenue: trips.reduce((sum, t) => sum.plus(t.totalAmount), new Decimal(0)),
        totalPlatformFees: trips.reduce(
          (sum, t) => sum.plus(t.platformFee || 0),
          new Decimal(0)
        ),
        totalDriverPayouts: trips.reduce(
          (sum, t) => sum.plus(t.driverPayout || 0),
          new Decimal(0)
        )
      }
    };
  } catch (error) {
    console.error('Error generating payout report:', error);
    throw error;
  }
}
