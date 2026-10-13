import { prisma } from '$lib/server/db/client';
import type { NotificationType } from '@prisma/client';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

/**
 * Creates a new notification for a user
 */
export async function createNotification(data: CreateNotificationData): Promise<any> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Gets notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean = false,
  skip: number = 0,
  take: number = 50
): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
  try {
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { isRead: false })
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.notification.count({
        where: {
          userId,
          ...(unreadOnly && { isRead: false })
        }
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
    ]);

    return {
      notifications,
      total,
      unreadCount
    };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(notificationId: BigInt): Promise<any> {
  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Marks all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<{ count: number }> {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    return { count: result.count };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Deletes a notification
 */
export async function deleteNotification(notificationId: BigInt): Promise<{ success: boolean }> {
  try {
    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Deletes all read notifications for a user
 */
export async function deleteOldNotifications(
  userId: string,
  olderThanDays: number = 30
): Promise<{ count: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return { count: result.count };
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    throw error;
  }
}

/**
 * Gets unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

/**
 * Creates trip-related notifications
 * Helper function to standardize trip notifications
 */
export async function notifyTripEvent(
  driverId: BigInt,
  customerId: BigInt,
  tripId: BigInt,
  eventType: 'assigned' | 'started' | 'completed' | 'cancelled'
): Promise<void> {
  try {
    // Get driver and customer user IDs
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true }
    });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true }
    });

    if (!driver || !customer) {
      console.warn('Driver or customer not found for trip notification');
      return;
    }

    // Get user records
    const driverUser = await prisma.user.findFirst({
      where: { driverId: driverId },
      select: { id: true }
    });

    const customerUser = await prisma.user.findFirst({
      where: { customerId: customerId }
    });

    // Create notifications based on event type
    const notificationMap = {
      assigned: {
        driver: {
          type: 'trip_assigned' as NotificationType,
          title: 'Trip Assigned',
          message: `You have been assigned a new trip to ${customer.name}`
        }
      },
      started: {
        driver: {
          type: 'trip_started' as NotificationType,
          title: 'Trip Started',
          message: `Your trip has started`
        },
        customer: {
          type: 'trip_started' as NotificationType,
          title: 'Trip Started',
          message: `Your trip with ${driver.name} has started`
        }
      },
      completed: {
        driver: {
          type: 'trip_completed' as NotificationType,
          title: 'Trip Completed',
          message: `Trip to ${customer.name} completed successfully`
        },
        customer: {
          type: 'trip_completed' as NotificationType,
          title: 'Trip Completed',
          message: `Your trip with ${driver.name} has been completed`
        }
      },
      cancelled: {
        driver: {
          type: 'trip_cancelled' as NotificationType,
          title: 'Trip Cancelled',
          message: `Trip to ${customer.name} has been cancelled`
        },
        customer: {
          type: 'trip_cancelled' as NotificationType,
          title: 'Trip Cancelled',
          message: `Your trip with ${driver.name} has been cancelled`
        }
      }
    };

    const notifications = notificationMap[eventType];

    // Notify driver if applicable
    if (driverUser && notifications.driver) {
      await createNotification({
        userId: driverUser.id,
        type: notifications.driver.type,
        title: notifications.driver.title,
        message: notifications.driver.message
      }).catch(e => console.error('Failed to notify driver:', e));
    }

    // Notify customer if applicable
    if (customerUser && notifications.customer) {
      await createNotification({
        userId: customerUser.id,
        type: notifications.customer.type,
        title: notifications.customer.title,
        message: notifications.customer.message
      }).catch(e => console.error('Failed to notify customer:', e));
    }
  } catch (error) {
    console.error('Error notifying trip event:', error);
    // Don't throw - notifications are nice-to-have, not critical
  }
}

/**
 * Creates payment-related notification
 */
export async function notifyPaymentReceived(
  customerId: BigInt,
  tripId: BigInt,
  amount: number
): Promise<void> {
  try {
    const customerUser = await prisma.user.findFirst({
      where: { customerId: customerId }
    });

    if (customerUser) {
      await createNotification({
        userId: customerUser.id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Payment of €${amount.toFixed(2)} received for trip #${tripId}`
      }).catch(e => console.error('Failed to notify payment:', e));
    }
  } catch (error) {
    console.error('Error notifying payment:', error);
  }
}

/**
 * Creates tour-related notifications
 */
export async function notifyTourEvent(
  driverId: BigInt,
  eventType: 'started' | 'completed',
  tourTier: string
): Promise<void> {
  try {
    const driverUser = await prisma.user.findFirst({
      where: { driverId: driverId },
      select: { id: true }
    });

    if (driverUser) {
      const typeMap = {
        started: {
          type: 'tour_started' as NotificationType,
          title: 'Tour Started',
          message: `Your ${tourTier} city tour has started`
        },
        completed: {
          type: 'tour_completed' as NotificationType,
          title: 'Tour Completed',
          message: `Your ${tourTier} city tour has been completed`
        }
      };

      const notification = typeMap[eventType];
      await createNotification({
        userId: driverUser.id,
        type: notification.type,
        title: notification.title,
        message: notification.message
      }).catch(e => console.error('Failed to notify tour event:', e));
    }
  } catch (error) {
    console.error('Error notifying tour event:', error);
  }
}
