import { prisma } from '$lib/server/db/client';
import { getFromCache, setInCache, invalidateCache } from '$lib/server/cache/redis';

export type TourTier = 'silver' | 'gold' | 'platinum';

const CACHE_KEY_PRICING = 'pricing-configs';
const CACHE_TTL = 3600; // 1 hour

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
  // Try cache first
  const cached = await getFromCache<any[]>(CACHE_KEY_PRICING);
  if (cached) {
    return cached;
  }

  const configs = await prisma.tourPricingConfig.findMany({
    orderBy: [{ tier: 'asc' }, { minGuests: 'asc' }]
  });

  // Cache for 1 hour
  await setInCache(CACHE_KEY_PRICING, configs, CACHE_TTL);
  return configs;
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
  const result = await prisma.tourPricingConfig.create({
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

  // Invalidate cache
  await invalidateCache(CACHE_KEY_PRICING);
  return result;
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
  const result = await prisma.tourPricingConfig.update({
    where: { id },
    data
  });

  // Invalidate cache
  await invalidateCache(CACHE_KEY_PRICING);
  return result;
}

export async function deletePricingConfig(id: bigint) {
  const result = await prisma.tourPricingConfig.delete({
    where: { id }
  });

  // Invalidate cache
  await invalidateCache(CACHE_KEY_PRICING);
  return result;
}
