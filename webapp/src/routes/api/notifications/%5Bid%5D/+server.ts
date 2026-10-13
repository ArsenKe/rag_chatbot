import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  markNotificationAsRead,
  deleteNotification
} from '$lib/server/notifications/notification-service';

/**
 * POST /api/notifications/[id]?action=read
 * Mark notification as read
 */
export const POST: RequestHandler = async ({ locals, params, url }) => {
  try {
    if (!locals.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = BigInt(params.id);
    const action = url.searchParams.get('action');

    if (action === 'read') {
      const result = await markNotificationAsRead(notificationId);
      return json(result);
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return json(
      { error: 'Failed to update notification', details: String(error) },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    if (!locals.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = BigInt(params.id);

    const result = await deleteNotification(notificationId);
    return json(result);
  } catch (error) {
    console.error('Error deleting notification:', error);
    return json(
      { error: 'Failed to delete notification', details: String(error) },
      { status: 500 }
    );
  }
};
