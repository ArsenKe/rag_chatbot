# Trip Lifecycle Event Integration Guide

This guide explains how to use the event integration hooks for managing trip lifecycles, triggering notifications, and calculating payouts automatically.

## Overview

The trip event system provides three main lifecycle events:

1. **Trip Started** - Marks trip as `in_progress`, notifies customer
2. **Trip Completed** - Marks trip as `completed`, calculates payout, notifies driver
3. **Trip Cancelled** - Marks trip as `cancelled`, notifies customer, refunds driver

## Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ TRIP LIFECYCLE EVENTS                                           │
└─────────────────────────────────────────────────────────────────┘

Booking Created
      │
      ├─→ Trip assigned to driver
      │
      ├─→ POST /api/trips/:id/start
      │   ├─→ Update status: confirmed → in_progress
      │   ├─→ Update driver status: active → on_trip
      │   └─→ 📱 Notify customer: "Trip Started"
      │
      ├─→ [Trip in progress...]
      │
      ├─→ POST /api/trips/:id/complete
      │   ├─→ Update status: in_progress → completed
      │   ├─→ Calculate payout (20% fee, 80% driver)
      │   ├─→ Update driver status: on_trip → active
      │   └─→ 📱 Notify driver: "Payment Received: €25.50"
      │
      └─→ Trip completed ✅

      ALTERNATE: POST /api/trips/:id/cancel
          ├─→ Update status: * → cancelled
          ├─→ Update driver status back to active
          └─→ 📱 Notify customer: "Trip Cancelled"
```

## API Endpoints

### 1. Start Trip

```
POST /api/trips/:id/start
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Parameters:**
- `id` (path) - Trip ID (BigInt converted to string)

**Response:**
```json
{
  "id": 12345,
  "status": "in_progress",
  "startTime": "2026-11-06T14:30:00Z",
  "driverId": 789,
  "customerId": 456
}
```

**Example (JavaScript/Fetch):**
```javascript
const tripId = '12345';
const response = await fetch(`/api/trips/${tripId}/start`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Trip started:', result);
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5173/api/trips/12345/start \
  -H "Content-Type: application/json"
```

### 2. Complete Trip

```
POST /api/trips/:id/complete
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Parameters:**
- `id` (path) - Trip ID (BigInt converted to string)

**Response:**
```json
{
  "id": 12345,
  "status": "completed",
  "endTime": "2026-11-06T15:00:00Z",
  "totalAmount": "30.00",
  "platformFee": "6.00",
  "driverPayout": "24.00",
  "driverId": 789,
  "customerId": 456
}
```

**Automatic Actions:**
- ✅ Updates trip status to `completed`
- 💰 Calculates payout: `20% platform fee`, `80% driver payout`
- 📱 Sends notification to driver: "Payment Received"
- 👤 Updates driver status: `on_trip` → `active`

**Example (JavaScript/Fetch):**
```javascript
const tripId = '12345';
const response = await fetch(`/api/trips/${tripId}/complete`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Trip completed, driver payout:', result.driverPayout);
```

### 3. Cancel Trip

```
POST /api/trips/:id/cancel
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Body:**
```json
{
  "reason": "Driver unavailable" // Optional
}
```

**Response:**
```json
{
  "id": 12345,
  "status": "cancelled",
  "driverId": 789,
  "customerId": 456
}
```

**Automatic Actions:**
- ✅ Updates trip status to `cancelled`
- 📱 Sends notification to customer with cancellation reason
- 👤 Updates driver status back to `active`

**Example (JavaScript/Fetch):**
```javascript
const tripId = '12345';
const response = await fetch(`/api/trips/${tripId}/cancel`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Driver requested cancellation'
  })
});

const result = await response.json();
console.log('Trip cancelled:', result);
```

## Notification Details

### Trip Started Notification
- **Recipient:** Customer
- **Type:** `trip_started`
- **Title:** "Trip Started"
- **Message:** "Your trip is on the way"
- **Trigger:** When driver starts the trip

### Trip Completed / Payment Received
- **Recipient:** Driver
- **Type:** `trip_completed` / `payment_received`
- **Title:** "Payment Received"
- **Message:** "You received €25.50 for your trip"
- **Trigger:** When trip is marked as completed

### Trip Cancelled
- **Recipient:** Customer
- **Type:** `trip_cancelled`
- **Title:** "Trip Cancelled"
- **Message:** "Your trip has been cancelled. {reason}"
- **Trigger:** When trip is cancelled

## Payout Calculation

When a trip is completed, payouts are calculated as follows:

```
Total Fare: €30.00
Platform Fee (20%): €6.00
Driver Payout (80%): €24.00
```

**Calculation Logic:**
```
platformFee = totalAmount × 0.20
driverPayout = totalAmount × 0.80
```

**Fields Updated in Database:**
- `Trip.platformFee` - Platform commission
- `Trip.driverPayout` - Driver's net earning

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success - trip event processed |
| 400 | Bad Request - invalid trip ID |
| 401 | Unauthorized - not authenticated |
| 403 | Forbidden - insufficient permissions |
| 404 | Not Found - trip not found |
| 500 | Server Error - internal error |

**Example Error Response:**
```json
{
  "error": "Failed to complete trip",
  "details": "Trip 12345 not found"
}
```

## Integration Examples

### SvelteKit Component Example

```svelte
<script lang="ts">
  let tripId = '12345';
  let loading = false;
  let error: string | null = null;

  async function startTrip() {
    loading = true;
    error = null;
    try {
      const response = await fetch(`/api/trips/${tripId}/start`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to start trip');
      
      const result = await response.json();
      console.log('Trip started:', result);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error starting trip';
    } finally {
      loading = false;
    }
  }

  async function completeTrip() {
    loading = true;
    error = null;
    try {
      const response = await fetch(`/api/trips/${tripId}/complete`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to complete trip');
      
      const result = await response.json();
      console.log('Trip completed, driver earned:', result.driverPayout);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error completing trip';
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex gap-2">
  <button on:click={startTrip} disabled={loading}>
    {loading ? 'Starting...' : 'Start Trip'}
  </button>
  <button on:click={completeTrip} disabled={loading}>
    {loading ? 'Completing...' : 'Complete Trip'}
  </button>
</div>

{#if error}
  <p class="text-red-600">{error}</p>
{/if}
```

### Sequence Diagram

```
Driver App                  Backend                 Notification Service
    │                          │                            │
    ├─ POST /start ────────────→│                            │
    │                          ├─ Update Trip Status        │
    │                          ├─ Update Driver Status      │
    │                          ├─ Create Notification ─────→│
    │                          │                    📱 Customer
    │                          │                            │
    │  [Trip In Progress]       │                            │
    │  [≈30 minutes]            │                            │
    │                          │                            │
    ├─ POST /complete ─────────→│                            │
    │                          ├─ Update Trip Status        │
    │                          ├─ Calculate Payout          │
    │                          ├─ Update Trip Amounts       │
    │                          ├─ Create Payment Notif ────→│
    │                          │                    📱 Driver
    │←─ 200 OK ────────────────┤                            │
    │  driverPayout: €24.00    │                            │
    │                          │                            │
```

## Best Practices

### 1. Error Handling
Always handle errors gracefully in your frontend:

```typescript
try {
  const response = await fetch(`/api/trips/${tripId}/complete`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Trip completion failed:', error.details);
    return;
  }
} catch (err) {
  console.error('Network error:', err);
}
```

### 2. Notification Handling
Check notification settings before displaying alerts:

```typescript
// User can disable notifications in settings
const userNotifications = await fetch('/api/user/settings/notifications');
const settings = await userNotifications.json();

if (settings.enableTripNotifications) {
  showNotification('Trip completed!');
}
```

### 3. Optimistic Updates
Update the UI immediately, then confirm with server:

```typescript
// Update UI immediately
trip.status = 'in_progress';

// Confirm with server
const response = await fetch(`/api/trips/${tripId}/start`, {
  method: 'POST'
});

if (!response.ok) {
  // Revert if error
  trip.status = 'confirmed';
}
```

### 4. Race Condition Prevention
Prevent multiple simultaneous event calls:

```typescript
let isProcessing = false;

async function completeTrip() {
  if (isProcessing) return;
  
  isProcessing = true;
  try {
    await fetch(`/api/trips/${tripId}/complete`, { method: 'POST' });
  } finally {
    isProcessing = false;
  }
}
```

## Monitoring & Debugging

### Enable Debug Logging

The event handler logs all operations to console:

```
[Event] Trip started: 12345
[Event] Trip completed: 12345
[Payout] Calculated for trip 12345
[Notification] Payment notification sent for trip 12345
```

### Check Trip Status

Query the trip to verify status updates:

```bash
curl http://localhost:5173/api/trips/12345 \
  -H "Content-Type: application/json"
```

### Verify Notifications

Check user's notifications:

```bash
curl http://localhost:5173/api/notifications \
  -H "Content-Type: application/json"
```

## Database Queries

### Check Trip State

```sql
SELECT id, status, startTime, endTime, totalAmount, platformFee, driverPayout
FROM "Trip"
WHERE id = 12345;
```

### Check Driver Status

```sql
SELECT id, userId, status
FROM "Driver"
WHERE id = 789;
```

### Check Notifications Sent

```sql
SELECT id, userId, type, title, message, isRead, createdAt
FROM "Notification"
WHERE userId = 'user-id'
ORDER BY createdAt DESC
LIMIT 10;
```

## Testing

### Manual Testing Checklist

- [ ] Start trip → verify trip status changes to `in_progress`
- [ ] Start trip → verify driver status changes to `on_trip`
- [ ] Start trip → verify customer receives notification
- [ ] Complete trip → verify trip status changes to `completed`
- [ ] Complete trip → verify `platformFee` and `driverPayout` are calculated
- [ ] Complete trip → verify driver receives payment notification
- [ ] Complete trip → verify driver status changes to `active`
- [ ] Cancel trip → verify trip status changes to `cancelled`
- [ ] Cancel trip → verify driver status changes to `active`
- [ ] Cancel trip → verify customer receives cancellation notification

### Load Testing
Use Apache Bench or k6 to test event endpoints under load:

```bash
ab -n 1000 -c 10 -X POST http://localhost:5173/api/trips/12345/complete
```

## Troubleshooting

### Issue: Notifications not sent
- Check if notification service is running
- Verify user ID is correctly set in trip data
- Check `/api/notifications` endpoint for errors

### Issue: Payout not calculated
- Verify `totalAmount` is set on trip
- Check database for existing `platformFee` values
- Look for errors in `payout-service.ts`

### Issue: Driver status not updated
- Verify driver exists in database
- Check for concurrent updates to driver record
- Review database transaction logs

## Related Documentation

- [Notification Service](./notification-service.ts)
- [Payout Service](./payout-service.ts)
- [Trip Model](../prisma/schema.prisma)
- [Driver Model](../prisma/schema.prisma)
