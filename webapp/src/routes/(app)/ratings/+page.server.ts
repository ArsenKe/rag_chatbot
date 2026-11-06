import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);

    const driverId = BigInt(locals.user?.driverId ?? '0');

    // Get rating summary for rides
    const rideReviews = await prisma.review.findMany({
      where: {
        revieweeId: driverId,
        type: 'ride',
        isAnonymous: false
      },
      select: {
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        reviewer: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get rating summary for tours
    const tourReviews = await prisma.review.findMany({
      where: {
        revieweeId: driverId,
        type: 'tour',
        isAnonymous: false
      },
      select: {
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        reviewer: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const allReviews = [...rideReviews, ...tourReviews];

    // Calculate statistics
    const calculateStats = (reviews: any[]) => {
      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { five: 0, four: 0, three: 0, two: 0, one: 0 }
        };
      }

      const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
      const averageRating = totalRating / reviews.length;

      return {
        averageRating: Math.round(averageRating * 100) / 100,
        totalReviews: reviews.length,
        ratingDistribution: {
          five: reviews.filter((r: any) => r.rating === 5).length,
          four: reviews.filter((r: any) => r.rating === 4).length,
          three: reviews.filter((r: any) => r.rating === 3).length,
          two: reviews.filter((r: any) => r.rating === 2).length,
          one: reviews.filter((r: any) => r.rating === 1).length
        }
      };
    };

    const overallStats = calculateStats(allReviews);
    const rideStats = calculateStats(rideReviews);
    const tourStats = calculateStats(tourReviews);

    return {
      overall: {
        ...overallStats,
        type: 'overall'
      },
      ride: {
        ...rideStats,
        type: 'ride',
        reviews: rideReviews.map(r => ({
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          reviewerEmail: r.reviewer.email
        }))
      },
      tour: {
        ...tourStats,
        type: 'tour',
        reviews: tourReviews.map(r => ({
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          reviewerEmail: r.reviewer.email
        }))
      }
    };
  } catch (err) {
    console.error('Error loading ratings:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to load ratings');
  }
};
