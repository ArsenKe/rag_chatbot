import { z } from 'zod';

export const tourStartSchema = z.object({
  tier: z.enum(['silver', 'gold', 'platinum']),
  guestCount: z.coerce.number().int().min(1).max(20),
  language: z.string().trim().min(2)
});
