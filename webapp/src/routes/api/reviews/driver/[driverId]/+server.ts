import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { driverId } = params;
    const type = url.searchParams.get('type'); // Optional: 'ride' or 'tour'

    if (!driverId) {
      throw error(400, 'Driver ID required');
    }

    const where: any = {
      revieweeId: BigInt(driverId),
      isAnonymous: false
    };

    if (type && ['ride', 'tour'].includes(type)) {
      where.type = type;
    }

    // Get all reviews
    const reviews = await prisma.review.findMany({
      where,
      select: { rating: true }
    });

    if (reviews.length === 0) {
      return json({
        driverId,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          five: 0,
          four: 0,
          three: 0,
          two: 0,
          one: 0
        },
        type: type || 'all'
      });
    }

    // Calculate statistics
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = {
      five: reviews.filter(r => r.rating === 5).length,
      four: reviews.filter(r => r.rating === 4).length,
      three: reviews.filter(r => r.rating === 3).length,
      two: reviews.filter(r => r.rating === 2).length,
      one: reviews.filter(r => r.rating === 1).length
    };

    return json({
      driverId,
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews: reviews.length,
      ratingDistribution,
      type: type || 'all'
    });
  } catch (err) {
    console.error('Error fetching driver rating summary:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to fetch rating summary');
  }
};
