# Priority 2 Integration Guide

## Already Integrated ✅

### 1. Trip Assignment Notification
**File:** `src/lib/server/assignments/assignment-validator.ts`

**Changes Made:**
- Added import: `import { notifyTripEvent } from '$lib/server/notifications/notification-service';`
- Updated `assignTripToDriver()` to call `notifyTripEvent()` after successful assignment
- Notification is non-blocking (errors won't fail the assignment)

**Behavior:**
When a manager assigns a trip to a driver:
1. Trip status changes to 'assigned'
2. Driver status updates to 'on_trip'
3. ✅ Driver receives notification: "Trip Assigned - You have been assigned a new trip to [location]"

---

### 2. Trip Payout Calculation on Creation
**File:** `src/routes/api/bookings/+server.ts`

**Changes Made:**
- Added import: `import { calculateAndUpdateTripPayout } from '$lib/server/payouts/payout-service';`
- After trip creation in transaction, call `calculateAndUpdateTripPayout(trip.id, 20)`
- Calculation is non-blocking

**Behavior:**
When a driver creates a booking/trip:
1. Trip is created with fareAmount, discountAmount, totalAmount
2. ✅ Platform fee calculated as 20% of totalAmount
3. ✅ Driver payout calculated as 80% of totalAmount
4. Both values stored in Trip.platformFee and Trip.driverPayout

**Example:**
```
Driver creates trip with:
- totalAmount: €50.00

System calculates:
- platformFee: €10.00 (20%)
- driverPayout: €40.00 (80%)
```

---

## To Be Integrated (Next Phase)

### 3. Trip Started Notification
**Location:** Trip status update endpoint (likely in `/api/trips/[id]` or `/api/trips/[id]/start`)

**Code to Add:**
```typescript
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

// When updating trip status to 'in_progress'
if (updateData.status === 'in_progress') {
  await prisma.trip.update({
    where: { id: tripId },
    data: { status: 'in_progress' }
  });

  // Notify both driver and customer
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { driverId: true, customerId: true }
  });

  if (trip) {
    await notifyTripEvent(trip.driverId, trip.customerId, tripId, 'started')
      .catch(err => console.warn('Notification failed:', err));
  }
}
```

---

### 4. Trip Completed Notification
**Location:** Trip completion endpoint

**Code to Add:**
```typescript
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

// When marking trip as complete
if (updateData.status === 'completed') {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { 
      status: 'completed',
      endTime: new Date() // If not already set
    },
    select: { driverId: true, customerId: true }
  });

  // Notify both driver and customer trip is done
  await notifyTripEvent(trip.driverId, trip.customerId, tripId, 'completed')
    .catch(err => console.warn('Notification failed:', err));
}
```

---

### 5. Payment Received Notification
**Location:** Payment processing endpoint (e.g., `/api/payments`, `/api/trips/[id]/payment`)

**Code to Add:**
```typescript
import { notifyPaymentReceived } from '$lib/server/notifications/notification-service';

// When payment is confirmed
const payment = await prisma.payment.create({
  data: {
    tripId,
    amount,
    method: paymentMethod,
    paidAt: new Date()
  }
});

// Notify customer payment received
const trip = await prisma.trip.findUnique({
  where: { id: tripId },
  select: { customerId: true }
});

if (trip) {
  await notifyPaymentReceived(trip.customerId, tripId, Number(amount))
    .catch(err => console.warn('Notification failed:', err));
}
```

---

### 6. Tour Started Notification
**Location:** City tour start endpoint

**Code to Add:**
```typescript
import { notifyTourEvent } from '$lib/server/notifications/notification-service';

// When starting a city tour
const tour = await prisma.cityTour.update({
  where: { id: tourId },
  data: {
    status: 'in_progress',
    startedAt: new Date()
  },
  select: { driverId: true, tier: true }
});

// Notify driver tour started
await notifyTourEvent(tour.driverId, 'started', tour.tier)
  .catch(err => console.warn('Notification failed:', err));
```

---

### 7. Tour Completed Notification
**Location:** City tour completion endpoint

**Code to Add:**
```typescript
import { notifyTourEvent } from '$lib/server/notifications/notification-service';

// When completing a city tour
const tour = await prisma.cityTour.update({
  where: { id: tourId },
  data: {
    status: 'completed',
    endedAt: new Date()
  },
  select: { driverId: true, tier: true }
});

// Notify driver tour completed
await notifyTourEvent(tour.driverId, 'completed', tour.tier)
  .catch(err => console.warn('Notification failed:', err));
```

---

## Testing Guide

### 1. Database Migration
```bash
cd webapp
npx prisma db push
```

✅ Should complete without errors. New tables/enums created:
- `Notification` table
- `NotificationType` enum
- `Trip.platformFee`, `Trip.driverPayout` columns

---

### 2. Test Notification Creation (Manual)
```bash
# Get a user ID from your database
# Then test the API:

curl -X GET http://localhost:5173/api/notifications \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Response should be:
{
  "notifications": [],
  "total": 0,
  "unreadCount": 0
}
```

---

### 3. Test Booking with Payout Calculation
```bash
# Create a booking (which creates a trip with payout calculation)
curl -X POST http://localhost:5173/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "customerId": 123,
    "pickupLocationId": 456,
    "dropoffLocationId": 789,
    "requestedStart": "2026-10-14T10:00:00Z",
    "requestedEnd": "2026-10-14T11:00:00Z",
    "fareAmount": 50.00,
    "carClass": "sedan"
  }'

# Response trip should include:
{
  "trip": {
    "id": 999,
    "totalAmount": 50.00,
    "platformFee": 10.00,
    "driverPayout": 40.00
  }
}
```

---

### 4. Test Assignment with Notification
```bash
# Assign trip to driver (this should now trigger notification)
curl -X POST http://localhost:5173/api/trips/999/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=MANAGER_TOKEN" \
  -d '{
    "tripId": 999,
    "driverId": 456
  }'

# After this, driver should have a notification:
curl -X GET http://localhost:5173/api/notifications \
  -H "Cookie: sb-access-token=DRIVER_TOKEN"

# Response should include:
{
  "notifications": [
    {
      "id": "123",
      "type": "trip_assigned",
      "title": "Trip Assigned",
      "message": "You have been assigned a new trip to...",
      "isRead": false
    }
  ],
  "unreadCount": 1
}
```

---

### 5. Test Driver Earnings
```bash
# Get driver's earnings for current month
curl -X GET "http://localhost:5173/api/drivers/456/payouts?startDate=2026-10-01&endDate=2026-10-31" \
  -H "Cookie: sb-access-token=DRIVER_TOKEN"

# Response:
{
  "driverId": "456",
  "totalTrips": 5,
  "totalGrossRevenue": "250.00",
  "totalPlatformFees": "50.00",
  "totalEarnings": "200.00",
  "averagePerTrip": "40.00"
}
```

---

### 6. Test Platform Statistics
```bash
# Get platform revenue statistics (admin/manager only)
curl -X GET "http://localhost:5173/api/payouts/stats?startDate=2026-10-01&endDate=2026-10-31" \
  -H "Cookie: sb-access-token=MANAGER_TOKEN"

# Response:
{
  "totalTrips": 156,
  "totalGrossRevenue": "7800.00",
  "totalPlatformFees": "1560.00",
  "totalDriverPayouts": "6240.00",
  "platformMarginPercent": 20.0
}
```

---

## Integration Checklist

### Phase 1: Already Done ✅
- [x] Database schema migration (NotificationType, Notification model, payout fields)
- [x] Notification service layer (create, read, delete, get unread)
- [x] Payout calculation service (calculate, track earnings, reports)
- [x] Notification API endpoints (GET, POST, DELETE)
- [x] Payout API endpoints (platform stats, driver earnings)
- [x] Trip assignment integration (notification on assign)
- [x] Trip creation integration (payout calculation on create)

### Phase 2: To Do Next
- [ ] Trip started integration (notifyTripEvent 'started')
- [ ] Trip completed integration (notifyTripEvent 'completed')
- [ ] Payment received integration (notifyPaymentReceived)
- [ ] Tour started integration (notifyTourEvent 'started')
- [ ] Tour completed integration (notifyTourEvent 'completed')
- [ ] Frontend notification bell component
- [ ] Frontend earnings dashboard
- [ ] Frontend payout reports page

---

## Common Integration Patterns

### Pattern 1: Update with Notification
```typescript
// BEFORE (without notification)
await prisma.trip.update({
  where: { id: tripId },
  data: { status: 'in_progress' }
});

// AFTER (with notification)
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

const trip = await prisma.trip.update({
  where: { id: tripId },
  data: { status: 'in_progress' },
  select: { driverId: true, customerId: true }
});

// Non-blocking notification
await notifyTripEvent(trip.driverId, trip.customerId, tripId, 'started')
  .catch(err => console.warn('Notification failed:', err));
```

---

### Pattern 2: Create with Payout Calculation
```typescript
// BEFORE (without payout)
const trip = await prisma.trip.create({
  data: { /* trip fields */ }
});

// AFTER (with payout)
import { calculateAndUpdateTripPayout } from '$lib/server/payouts/payout-service';

const trip = await prisma.trip.create({
  data: { /* trip fields */ }
});

// Non-blocking payout calculation
await calculateAndUpdateTripPayout(trip.id, 20) // 20% commission
  .catch(err => console.warn('Payout calculation failed:', err));
```

---

### Pattern 3: Transaction with Audit + Notification
```typescript
// Full pattern with transaction, audit, and notification
import { notifyTripEvent } from '$lib/server/notifications/notification-service';

const result = await prisma.$transaction(async tx => {
  const trip = await tx.trip.update({
    where: { id: tripId },
    data: { status: 'completed' },
    select: { driverId: true, customerId: true }
  });

  // Audit in transaction
  await tx.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'completed',
      entityType: 'Trip',
      entityId: tripId.toString(),
      newValue: { status: 'completed' }
    }
  });

  return trip;
});

// Notification after transaction (non-blocking)
await notifyTripEvent(result.driverId, result.customerId, tripId, 'completed')
  .catch(err => console.warn('Notification failed:', err));
```

---

## Troubleshooting

### Notifications Not Appearing
1. Check user ID is UUID format (not BigInt)
2. Verify database migration ran: `npx prisma db push`
3. Check notification service for console errors
4. Verify user record exists in database

### Payouts Not Calculating
1. Ensure `calculateAndUpdateTripPayout()` is being called after trip creation
2. Check that Trip model has platformFee and driverPayout fields
3. Verify totalAmount is set on the trip
4. Check service logs for calculation errors

### Performance Issues
- Notifications: Use pagination (skip/take) for large result sets
- Payouts: Use date-range queries to limit dataset
- Both: Consider background job queues for high-volume operations

---

## Files Modified

1. `src/lib/server/assignments/assignment-validator.ts`
   - Added notification on trip assignment
   
2. `src/routes/api/bookings/+server.ts`
   - Added payout calculation after trip creation

---

## Next: Frontend Components

Once backend integration is complete, create:

1. **Notification Bell** - Show unread count, dropdown list
2. **Notification Panel** - Full notification history with read/delete
3. **Driver Dashboard** - Show current month earnings
4. **Manager Reports** - Platform revenue and top earners

See respective README files for API reference.
