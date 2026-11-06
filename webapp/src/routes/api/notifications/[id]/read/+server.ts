import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client';

/**
 * PATCH /api/notifications/[id]/read
 * Mark a single notification as read
 */
export const PATCH: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    // Update notification
    const updated = await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    // Verify it belongs to the user
    if (updated.userId !== locals.user.id) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    return json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return json(
      { error: 'Failed to mark notification as read', details: String(error) },
      { status: 500 }
    );
  }
};
