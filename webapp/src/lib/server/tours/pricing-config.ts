import { prisma } from '$lib/server/db/client';

export type TourTier = 'silver' | 'gold' | 'platinum';

export async function getPricingConfig(tier: TourTier) {
  const configs = await prisma.tourPricingConfig.findMany({
    where: { tier },
    orderBy: { minGuests: 'asc' }
  });

  return configs;
}

export async function calculateTourPriceFromDB(tier: TourTier, guestCount: number) {
  const configs = await getPricingConfig(tier);

  if (configs.length === 0) {
    throw new Error(`No pricing configuration found for tier: ${tier}`);
  }

  // Find the matching price range for guest count
  const config = configs.find((c) => guestCount >= c.minGuests && guestCount <= c.maxGuests);

  if (!config) {
    throw new Error(`No pricing configuration found for tier ${tier} with ${guestCount} guests`);
  }

  // Calculate price based on guest count
  const guestsAboveMin = Math.max(0, guestCount - config.minGuests);
  const price = Number(config.basePricePerTour) + guestsAboveMin * Number(config.pricePerAdditionalGuestBeyond);
  const commissionPercentage = Number(config.driverCommissionPercentage) / 100;
  const commission = Math.round(price * commissionPercentage * 100) / 100;

  return {
    durationMinutes: config.durationMinutes,
    price: Math.round(price * 100) / 100,
    commission: Math.round(commission * 100) / 100
  };
}

export async function getAllPricingConfigs() {
  return await prisma.tourPricingConfig.findMany({
    orderBy: [{ tier: 'asc' }, { minGuests: 'asc' }]
  });
}

export async function createPricingConfig(data: {
  tier: TourTier;
  minGuests: number;
  maxGuests: number;
  basePricePerTour: number;
  pricePerAdditionalGuestBeyond: number;
  durationMinutes: number;
  driverCommissionPercentage: number;
}) {
  return await prisma.tourPricingConfig.create({
    data: {
      tier: data.tier,
      minGuests: data.minGuests,
      maxGuests: data.maxGuests,
      basePricePerTour: data.basePricePerTour,
      pricePerAdditionalGuestBeyond: data.pricePerAdditionalGuestBeyond,
      durationMinutes: data.durationMinutes,
      driverCommissionPercentage: data.driverCommissionPercentage
    }
  });
}

export async function updatePricingConfig(
  id: bigint,
  data: Partial<{
    minGuests: number;
    maxGuests: number;
    basePricePerTour: number;
    pricePerAdditionalGuestBeyond: number;
    durationMinutes: number;
    driverCommissionPercentage: number;
  }>
) {
  return await prisma.tourPricingConfig.update({
    where: { id },
    data
  });
}

export async function deletePricingConfig(id: bigint) {
  return await prisma.tourPricingConfig.delete({
    where: { id }
  });
}
