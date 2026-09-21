export type TourTier = 'silver' | 'gold' | 'platinum';

// Base duration/price per tier; price scales up with extra guests beyond the first two
export const TIER_CONFIG: Record<TourTier, { durationMinutes: number; basePrice: number; extraGuestFee: number }> = {
  silver: { durationMinutes: 45, basePrice: 60, extraGuestFee: 8 },
  gold: { durationMinutes: 75, basePrice: 90, extraGuestFee: 10 },
  platinum: { durationMinutes: 120, basePrice: 140, extraGuestFee: 12 }
};

const COMMISSION_RATE = 0.3;
const INCLUDED_GUESTS = 2;

export function calculateTourPrice(tier: TourTier, guestCount: number) {
  const config = TIER_CONFIG[tier];
  const extraGuests = Math.max(0, guestCount - INCLUDED_GUESTS);
  const price = config.basePrice + extraGuests * config.extraGuestFee;
  const commission = Math.round(price * COMMISSION_RATE * 100) / 100;

  return {
    durationMinutes: config.durationMinutes,
    price,
    commission
  };
}
