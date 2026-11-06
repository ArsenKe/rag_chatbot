/**
 * Notification types as defined in Prisma schema
 */
export type NotificationType =
  | 'trip_assigned'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'payment_received'
  | 'tour_started'
  | 'tour_completed'
  | 'review_received';

/**
 * Notification model interface
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated notification response
 */
export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}
