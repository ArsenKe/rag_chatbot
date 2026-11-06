import { json } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserNotifications } from '$lib/server/notifications/notification-service';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user?.id) {
    throw new Error('Unauthorized');
  }

  const page = parseInt(url.searchParams.get('page') || '1');
  const take = 20;
  const skip = (page - 1) * take;

  const result = await getUserNotifications(locals.user.id, false, skip, take);

  return {
    notifications: result.notifications,
    total: result.total,
    unreadCount: result.unreadCount,
    page,
    pageSize: take
  };
};
