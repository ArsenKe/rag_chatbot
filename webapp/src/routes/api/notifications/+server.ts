import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/auth/jwt';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  getUnreadCount
} from '$lib/server/notifications/notification-service';

/**
 * GET /api/notifications
 * Get notifications for current user
 * Query params:
 * - unread=true (only unread)
 * - skip=0
 * - take=50
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    // Get current user
    if (!locals.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadOnly = url.searchParams.get('unread') === 'true';
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '50');

    const result = await getUserNotifications(locals.user.id, unreadOnly, skip, take);

    return json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return json(
      { error: 'Failed to fetch notifications', details: String(error) },
      { status: 500 }
    );
  }
};

/**
 * POST /api/notifications?action=mark-all-read
 * Mark all unread notifications as read
 */
export const POST: RequestHandler = async ({ locals, url }) => {
  try {
    // Get current user
    if (!locals.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = url.searchParams.get('action');

    if (action === 'mark-all-read') {
      const result = await markAllNotificationsAsRead(locals.user.id);
      return json(result);
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing notification action:', error);
    return json(
      { error: 'Failed to process action', details: String(error) },
      { status: 500 }
    );
  }
};
