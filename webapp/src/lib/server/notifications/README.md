# Notification System Guide

## Overview

The notification system provides real-time and persistent user notifications for trip events, payments, tours, and reviews. Notifications are stored in the database with read/unread status and can be retrieved via REST API.

## Database Schema

### NotificationType Enum
```prisma
enum NotificationType {
  trip_assigned      // Driver assigned to trip
  trip_started       // Trip has begun
  trip_completed     // Trip finished successfully
  trip_cancelled     // Trip cancelled
  payment_received   // Payment confirmation
  tour_started       // City tour started
  tour_completed     // City tour completed
  review_received    // Customer review submitted
}
```

### Notification Model
```prisma
model Notification {
  id        BigInt               @id @default(autoincrement())
  userId    String               // User receiving notification
  type      NotificationType     // Type of event
  title     String               // Short title (e.g., "Trip Assigned")
  message   String               // Detailed message with context
  isRead    Boolean              @default(false)
  createdAt DateTime             @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead, createdAt])
  @@index([userId, createdAt])
}
```

## Service Layer Functions

Location: `src/lib/server/notifications/notification-service.ts`

### createNotification(data)
Creates a new notification for a user.

**Parameters:**
```typescript
{
  userId: string;           // User ID from auth system
  type: NotificationType;   // Event type
  title: string;            // Display title
  message: string;          // Detailed message
}
```

**Example:**
```typescript
await createNotification({
  userId: "user-123",
  type: 'trip_assigned',
  title: 'Trip Assigned',
  message: 'You have been assigned a new trip to Vienna Central Station'
});
```

---

### getUserNotifications(userId, unreadOnly?, skip?, take?)
Retrieves notifications for a user with optional filtering.

**Parameters:**
- `userId` (string) - User ID to fetch notifications for
- `unreadOnly` (boolean, default: false) - Only return unread notifications
- `skip` (number, default: 0) - Pagination offset
- `take` (number, default: 50) - Number of notifications to fetch

**Returns:**
```typescript
{
  notifications: Notification[];  // Array of notification objects
  total: number;                  // Total count in database
  unreadCount: number;            // Number of unread notifications
}
```

**Example:**
```typescript
const result = await getUserNotifications("user-123", true, 0, 20);
console.log(`${result.unreadCount} unread of ${result.total} total`);
```

---

### markNotificationAsRead(notificationId)
Marks a single notification as read.

**Parameters:**
- `notificationId` (BigInt) - Notification ID to mark as read

**Returns:** Updated Notification object

**Example:**
```typescript
await markNotificationAsRead(BigInt(12345));
```

---

### markAllNotificationsAsRead(userId)
Marks all unread notifications for a user as read.

**Parameters:**
- `userId` (string) - User ID

**Returns:** `{ count: number }` - Number of notifications updated

**Example:**
```typescript
const result = await markAllNotificationsAsRead("user-123");
console.log(`Marked ${result.count} as read`);
```

---

### deleteNotification(notificationId)
Deletes a single notification.

**Parameters:**
- `notificationId` (BigInt) - Notification ID to delete

**Returns:** `{ success: boolean }`

**Example:**
```typescript
await deleteNotification(BigInt(12345));
```

---

### deleteOldNotifications(userId, olderThanDays?)
Deletes old read notifications for a user (default 30+ days old).

**Parameters:**
- `userId` (string) - User ID
- `olderThanDays` (number, default: 30) - Delete notifications older than this many days

**Returns:** `{ count: number }` - Number of notifications deleted

**Example:**
```typescript
// Clean up 60+ day old notifications
await deleteOldNotifications("user-123", 60);
```

---

### getUnreadCount(userId)
Gets the count of unread notifications for a user.

**Parameters:**
- `userId` (string) - User ID

**Returns:** `number` - Count of unread notifications

**Example:**
```typescript
const unreadCount = await getUnreadCount("user-123");
console.log(`${unreadCount} new notifications`);
```

---

### notifyTripEvent(driverId, customerId, tripId, eventType)
Helper function to create trip-related notifications for both driver and customer.

**Parameters:**
- `driverId` (BigInt) - Driver's ID
- `customerId` (BigInt) - Customer's ID
- `tripId` (BigInt) - Trip's ID
- `eventType` ('assigned' | 'started' | 'completed' | 'cancelled')

**Behavior:**
- For `assigned`: Notifies driver
- For `started`: Notifies both driver and customer
- For `completed`: Notifies both driver and customer
- For `cancelled`: Notifies both driver and customer

**Example:**
```typescript
// When assignment completes
await notifyTripEvent(BigInt(456), BigInt(789), BigInt(123), 'assigned');

// When trip finishes
await notifyTripEvent(BigInt(456), BigInt(789), BigInt(123), 'completed');
```

---

### notifyPaymentReceived(customerId, tripId, amount)
Creates a payment received notification for customer.

**Parameters:**
- `customerId` (BigInt) - Customer's ID
- `tripId` (BigInt) - Associated trip ID
- `amount` (number) - Payment amount in EUR

**Example:**
```typescript
await notifyPaymentReceived(BigInt(789), BigInt(123), 50.00);
```

---

### notifyTourEvent(driverId, eventType, tourTier)
Creates tour-related notifications.

**Parameters:**
- `driverId` (BigInt) - Driver's ID
- `eventType` ('started' | 'completed')
- `tourTier` (string) - Tour tier (e.g., 'Silver', 'Gold', 'Platinum')

**Example:**
```typescript
await notifyTourEvent(BigInt(456), 'started', 'Platinum');
```

---

## REST API Endpoints

### GET /api/notifications
Get notifications for current user.

**Query Parameters:**
- `unread` (boolean, optional) - Filter by unread status
- `skip` (number, optional) - Pagination offset (default: 0)
- `take` (number, optional) - Number to fetch (default: 50)

**Authentication:** Required (JWT from auth cookie)

**Example Request:**
```bash
# Get all notifications
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/notifications"

# Get unread notifications only
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/notifications?unread=true"

# Get second page with pagination
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/notifications?skip=50&take=25"
```

**Example Response:**
```json
{
  "notifications": [
    {
      "id": "12345",
      "userId": "user-123",
      "type": "trip_assigned",
      "title": "Trip Assigned",
      "message": "You have been assigned a new trip to Vienna Central Station",
      "isRead": false,
      "createdAt": "2026-10-13T10:30:00Z"
    }
  ],
  "total": 42,
  "unreadCount": 7
}
```

---

### POST /api/notifications
Mark all unread notifications as read.

**Query Parameters:**
- `action` (string, required) - Must be "mark-all-read"

**Authentication:** Required

**Example Request:**
```bash
curl -X POST -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/notifications?action=mark-all-read"
```

**Example Response:**
```json
{
  "count": 7
}
```

---

### POST /api/notifications/[id]
Mark a single notification as read.

**Parameters:**
- `id` (path) - Notification ID
- `action` (query, required) - Must be "read"

**Authentication:** Required

**Example Request:**
```bash
curl -X POST -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/notifications/12345?action=read"
```

**Example Response:**
```json
{
  "id": "12345",
  "isRead": true
}
```

---

### DELETE /api/notifications/[id]
Delete a notification.

**Parameters:**
- `id` (path) - Notification ID

**Authentication:** Required

**Example Request:**
```bash
curl -X DELETE -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/notifications/12345"
```

**Example Response:**
```json
{
  "success": true
}
```

---

## Integration Examples

### Integration with Assignment Engine

After assigning a trip to driver:
```typescript
// In assignment-validator.ts
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

export async function assignTripToDriver(tripId: BigInt, driverId: BigInt, userId: string) {
  // ... existing validation and assignment logic ...

  // Notify driver of assignment
  await notifyTripEvent(driverId, trip.customerId, tripId, 'assigned');

  return updatedTrip;
}
```

### Integration with Trip Status Updates

When trip starts:
```typescript
// In trip update endpoint
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

if (updateData.status === 'in_progress') {
  await notifyTripEvent(trip.driverId, trip.customerId, trip.id, 'started');
}
```

When trip completes:
```typescript
if (updateData.status === 'completed') {
  await notifyTripEvent(trip.driverId, trip.customerId, trip.id, 'completed');
}
```

### Integration with Payment System

When payment received:
```typescript
// In payment processing
import { notifyPaymentReceived } from '$lib/server/notifications/notification-service';

await notifyPaymentReceived(customerId, tripId, amountEUR);
```

---

## Frontend Integration

### Svelte Store for Notifications (Optional)

Create `src/lib/stores/notifications.ts`:
```typescript
import { writable } from 'svelte/store';

export const notifications = writable<Notification[]>([]);
export const unreadCount = writable<number>(0);

// Fetch on page load
export async function loadNotifications() {
  const response = await fetch('/api/notifications?unread=true');
  const data = await response.json();
  notifications.set(data.notifications);
  unreadCount.set(data.unreadCount);
}

// Mark as read
export async function markAsRead(notificationId: string) {
  await fetch(`/api/notifications/${notificationId}?action=read`, {
    method: 'POST'
  });
  
  // Refresh list
  await loadNotifications();
}
```

### Svelte Component Example

```svelte
<script>
  import { onMount } from 'svelte';
  import { notifications, unreadCount, loadNotifications, markAsRead } from '$lib/stores/notifications';

  onMount(async () => {
    await loadNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="notification-bell">
  🔔 {$unreadCount > 0 ? `(${$unreadCount})` : ''}
</div>

<div class="notification-list">
  {#each $notifications as notif (notif.id)}
    <div class="notification" class:unread={!notif.isRead}>
      <div class="title">{notif.title}</div>
      <div class="message">{notif.message}</div>
      <div class="time">{new Date(notif.createdAt).toLocaleString()}</div>
      {#if !notif.isRead}
        <button on:click={() => markAsRead(notif.id)}>Mark Read</button>
      {/if}
    </div>
  {/each}
</div>
```

---

## Database Maintenance

### Automatic Cleanup (Recommended)

Add to your backend scheduler (e.g., cron job):
```typescript
// Run daily
import { deleteOldNotifications } from '$lib/server/notifications/notification-service';

export async function dailyNotificationCleanup() {
  // Delete read notifications older than 90 days
  const result = await deleteOldNotifications(undefined, 90);
  console.log(`Cleaned up ${result.count} old notifications`);
}
```

### Manual Cleanup

```bash
# Delete all old notifications for a user
await deleteOldNotifications("user-123", 30);

# Delete all old notifications for all users
const allUsers = await prisma.user.findMany();
for (const user of allUsers) {
  await deleteOldNotifications(user.id, 30);
}
```

---

## Testing

### Test Creating Notifications

```typescript
import { createNotification, getUserNotifications } from '$lib/server/notifications/notification-service';

// Create test notification
await createNotification({
  userId: 'test-user-1',
  type: 'trip_assigned',
  title: 'Test Trip',
  message: 'This is a test notification'
});

// Fetch and verify
const result = await getUserNotifications('test-user-1');
console.log(result.notifications.length); // Should be 1
```

### Test Reading Notifications

```typescript
const notifs = await getUserNotifications('test-user-1', false, 0, 1);
const notif = notifs.notifications[0];

await markNotificationAsRead(notif.id);

const updated = await getUserNotifications('test-user-1', true); // unreadOnly=true
console.log(updated.unreadCount); // Should be 0
```

---

## Performance Considerations

1. **Indexes**: The `Notification` table has indexes on:
   - `(userId, isRead, createdAt)` - Optimizes unread queries
   - `(userId, createdAt)` - Optimizes chronological fetches

2. **Pagination**: Always use `skip` and `take` for large result sets:
   ```typescript
   // Bad - loads all notifications
   const all = await getUserNotifications(userId, false, 0, 999999);
   
   // Good - paginate in batches of 50
   let skip = 0;
   while (true) {
     const batch = await getUserNotifications(userId, false, skip, 50);
     if (batch.notifications.length === 0) break;
     // Process batch...
     skip += 50;
   }
   ```

3. **Cleanup**: Regularly delete old read notifications to keep table size manageable:
   ```typescript
   // Run weekly
   await deleteOldNotifications(userId, 90); // Delete 90+ day old read notifications
   ```

---

## Troubleshooting

### Notifications Not Appearing

1. Check user ID is correct (UUID format)
2. Verify notification type exists in enum
3. Check notification creation isn't silently failing:
   ```typescript
   try {
     await createNotification(...);
   } catch (error) {
     console.error('Failed to create:', error);
   }
   ```

### Performance Issues

1. Check indexes are created:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'Notification';
   ```

2. Monitor query performance:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM "Notification"
   WHERE "userId" = $1 AND "isRead" = false
   ORDER BY "createdAt" DESC
   LIMIT 50;
   ```

3. Run cleanup if table is large:
   ```typescript
   await deleteOldNotifications(userId, 30);
   ```

### Race Conditions

The notification system uses database transactions implicitly via Prisma. For multi-step operations, use explicit transactions:
```typescript
await prisma.$transaction([
  prisma.trip.update({ ... }),
  prisma.notification.create({ ... })
]);
```
