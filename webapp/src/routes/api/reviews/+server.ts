import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user?.id) {
      throw error(401, 'Unauthorized: Not authenticated');
    }

    const body = await request.json();
    const { tripId, cityTourId, type, rating, title, comment, isAnonymous } = body;

    // Validation
    if (!type || !['ride', 'tour'].includes(type)) {
      throw error(400, 'Invalid review type');
    }

    if (!rating || rating < 1 || rating > 5) {
      throw error(400, 'Rating must be between 1 and 5');
    }

    if (type === 'ride' && !tripId) {
      throw error(400, 'Trip ID required for ride reviews');
    }

    if (type === 'tour' && !cityTourId) {
      throw error(400, 'City tour ID required for tour reviews');
    }

    // Verify user actually completed the trip/tour
    let revieweeId: bigint | null = null;
    let isVerified = false;

    if (type === 'ride' && tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: BigInt(tripId) },
        select: { customerId: true, driverId: true, status: true }
      });

      if (!trip) {
        throw error(404, 'Trip not found');
      }

      // Only customer or driver can review
      const userIsDriver = locals.user.driverId && BigInt(locals.user.driverId) === trip.driverId;
      const userIsCustomer = locals.user.customerId && BigInt(locals.user.customerId) === trip.customerId;

      if (!userIsDriver && !userIsCustomer) {
        throw error(403, 'Unauthorized: Not part of this trip');
      }

      // Can only review completed trips
      if (trip.status !== 'completed') {
        throw error(400, 'Can only review completed trips');
      }

      revieweeId = userIsDriver ? trip.customerId : trip.driverId;
      isVerified = true;
    }

    if (type === 'tour' && cityTourId) {
      const tour = await prisma.cityTour.findUnique({
        where: { id: BigInt(cityTourId) },
        select: { driverId: true, status: true }
      });

      if (!tour) {
        throw error(404, 'City tour not found');
      }

      // Only completed tours can be reviewed
      if (tour.status !== 'completed') {
        throw error(400, 'Can only review completed tours');
      }

      revieweeId = tour.driverId;
      isVerified = true;
    }

    // Check for duplicate review (user can only review once per trip/tour)
    const existingReview = await prisma.review.findFirst({
      where: {
        reviewerId: locals.user.id,
        tripId: tripId ? BigInt(tripId) : null,
        cityTourId: cityTourId ? BigInt(cityTourId) : null
      }
    });

    if (existingReview) {
      throw error(409, 'You have already reviewed this trip/tour');
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        reviewerId: locals.user.id,
        revieweeId: revieweeId,
        tripId: tripId ? BigInt(tripId) : null,
        cityTourId: cityTourId ? BigInt(cityTourId) : null,
        type: type as 'ride' | 'tour',
        rating,
        title: title || null,
        comment: comment || null,
        isAnonymous: isAnonymous ?? false,
        isVerified
      }
    });

    // Create notification for reviewee
    if (revieweeId) {
      const revieweeDriver = await prisma.driver.findUnique({
        where: { id: revieweeId },
        select: { id: true }
      });

      if (revieweeDriver) {
        // Get the driver's user to send notification
        const driverUser = await prisma.user.findFirst({
          where: { driverId: revieweeDriver.id }
        });

        if (driverUser) {
          await prisma.notification.create({
            data: {
              userId: driverUser.id,
              type: 'review_received',
              title: `New ${rating}-star ${type} review`,
              message: isAnonymous
                ? `You received a ${rating}-star review: "${title || comment}"`
                : `${locals.user?.email} left a ${rating}-star review`
            }
          });
        }
      }
    }

    return json(
      {
        success: true,
        review: {
          id: review.id.toString(),
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          createdAt: review.createdAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating review:', err);
    if (err instanceof Error && err.message.includes('Unauthorized') || err.message.includes('not found')) {
      throw err;
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to create review');
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const revieweeId = url.searchParams.get('revieweeId');
    const type = url.searchParams.get('type');
    const skip = parseInt(url.searchParams.get('skip') ?? '0');
    const take = parseInt(url.searchParams.get('take') ?? '20');

    if (!revieweeId) {
      throw error(400, 'revieweeId parameter required');
    }

    const where: any = {
      revieweeId: BigInt(revieweeId),
      isAnonymous: false // Only return non-anonymous reviews by default
    };

    if (type && ['ride', 'tour'].includes(type)) {
      where.type = type;
    }

    const reviews = await prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        type: true,
        createdAt: true,
        reviewer: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });

    const total = await prisma.review.count({ where });

    return json({
      reviews: reviews.map(r => ({
        id: r.id.toString(),
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        type: r.type,
        reviewerEmail: r.reviewer.email,
        createdAt: r.createdAt.toISOString()
      })),
      pagination: {
        skip,
        take,
        total,
        hasMore: skip + take < total
      }
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to fetch reviews');
  }
};
