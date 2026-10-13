# Assignment Engine - Quick Integration Guide

## ✅ What's Been Implemented

### 1. **Conflict Checker Service** (`conflict-checker.ts`)
   - ✅ Detects time overlaps with trips and tours
   - ✅ Checks driver availability blocks
   - ✅ Suggests available drivers
   - ✅ Calculates available time slots
   - ✅ Auto-updates driver operational status

### 2. **Assignment Validator** (`assignment-validator.ts`)
   - ✅ Validates trip assignments
   - ✅ Validates tour assignments
   - ✅ Executes assignments atomically
   - ✅ Logs all assignment actions
   - ✅ Handles rejections/reversals

### 3. **API Endpoints** (`/api/trips/[id]/+server.ts`)
   - ✅ POST `/api/trips/[id]/assign` - Assign trip
   - ✅ DELETE `/api/trips/[id]/assignment` - Reject assignment
   - ✅ GET `/api/trips/[id]/check-driver-availability` - Check availability

### 4. **Schema Updates** (`schema.prisma`)
   - ✅ Enhanced `DriverStatus` enum (6 states)
   - ✅ Enhanced `BookingStatus` enum (8 states)
   - ✅ Added `Driver.statusUpdatedAt`
   - ✅ Added `CityTour.scheduledStartAt/EndAt`

---

## 🚀 Next Steps (Required Before Launch)

### Step 1: Apply Schema Migration
```bash
cd webapp

# Generate migration (will create prisma/migrations/[timestamp]_init/)
npx prisma migrate dev --name add_assignment_engine

# Or if you want to use db push instead
npx prisma db push
```

### Step 2: Update Your Trip Assignment UI

**Current code** (if you have it in `/routes/api/trips`):
```typescript
// OLD - No conflict checking
await prisma.trip.update({
  where: { id: tripId },
  data: { driverId, status: 'confirmed' }
});
```

**New code** (replace with):
```typescript
// NEW - With conflict checking
import { assignTripToDriver } from '$lib/server/assignments/assignment-validator';

const result = await assignTripToDriver(tripId, driverId, userId);
if (!result.success) {
  return json({ error: result.error }, { status: 400 });
}
return json({ trip: result.trip });
```

### Step 3: Update Frontend (Optional but Recommended)

**Show "Suggest Drivers" button:**
```svelte
<script>
  import { suggestAvailableDrivers } from '$lib/server/assignments/conflict-checker';

  async function handleSuggestDrivers(trip) {
    const suggestions = await fetch(`/api/trips/${trip.id}/check-driver-availability`);
    const drivers = await suggestions.json();
    showDriverList(drivers);
  }
</script>

<button on:click={() => handleSuggestDrivers(trip)}>
  💡 Suggest Drivers
</button>
```

### Step 4: Update Assignment Endpoints

If you already have assignment endpoints, wrap them with the validator:

```typescript
// In /api/trips/[id]/+server.ts or similar
import { assignTripToDriver } from '$lib/server/assignments/assignment-validator';

export async function POST({ params, request, locals }) {
  const { driverId } = await request.json();
  const result = await assignTripToDriver(
    BigInt(params.id),
    BigInt(driverId),
    locals.user.id
  );
  
  if (!result.success) {
    return json({ error: result.error }, { status: 400 });
  }
  
  return json({ trip: result.trip });
}
```

---

## 🧪 Testing Before Deployment

### Test 1: Check Conflict Detection
```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Run test
npx ts-node -e "
import { checkAssignmentConflict } from './src/lib/server/assignments/conflict-checker';

const conflict = await checkAssignmentConflict(BigInt(1), {
  start: new Date('2024-10-15 10:00'),
  end: new Date('2024-10-15 11:00')
});

console.log(conflict.hasConflict ? 'Conflicts found' : 'No conflicts');
"
```

### Test 2: Test Assignment API
```bash
# Assign trip to driver
curl -X POST http://localhost:5173/api/trips/1/assign \
  -H "Content-Type: application/json" \
  -d '{"tripId": "1", "driverId": "1"}'

# Check driver availability
curl "http://localhost:5173/api/trips/1/check-driver-availability?driverId=2"
```

### Test 3: Verify Conflict Rejection
```bash
# Create two overlapping trips in database
psql $DATABASE_URL << 'EOF'
INSERT INTO "Trip" (driverId, carId, customerId, pickupLocationId, dropoffLocationId, startTime, endTime, status, durationMinutes, fareAmount, totalAmount)
VALUES (1, 1, 1, 1, 2, '2024-10-15 10:00', '2024-10-15 11:00', 'reserved', 60, 50, 50);

INSERT INTO "Trip" (driverId, carId, customerId, pickupLocationId, dropoffLocationId, startTime, endTime, status, durationMinutes, fareAmount, totalAmount)
VALUES (1, 1, 2, 2, 3, '2024-10-15 10:30', '2024-10-15 11:30', 'reserved', 60, 60, 60);
EOF

# Try to assign second trip - should fail with conflict
curl -X POST http://localhost:5173/api/trips/2/assign \
  -H "Content-Type: application/json" \
  -d '{"tripId": "2", "driverId": "1"}'

# Expected response:
# {"error": "Conflicts found: trip: Trip from ... to ..."}
```

---

## 📊 Schema Changes Summary

### Driver Status Transitions
```
new driver → active (available)
           ↓
       assigned trip → on_trip (driving)
                   ↓
              trip ends → active (available)
                   ↓
              driver sick → offline
                   ↓
            driver goes on PTO → vacation
                   ↓
         admin suspends driver → suspended
```

### Booking/Trip Status Transitions
```
Customer books → draft (temp)
             ↓
      confirms order → reserved
             ↓
  manager assigns → assigned
             ↓
   driver accepts → confirmed
             ↓
    driver starts → in_progress
             ↓
    trip ends ──→ completed ✅
      OR no_show ✅
      OR cancelled ✗
```

---

## 🔧 Configuration

### Environment Variables (Optional)
None required - uses existing database connection

### Feature Flags (Future)
```typescript
// When ready to toggle
const ASSIGNMENT_ENGINE_ENABLED = process.env.ASSIGNMENT_ENGINE_ENABLED === 'true';

if (ASSIGNMENT_ENGINE_ENABLED) {
  const result = await assignTripToDriver(...);
} else {
  // Old behavior (no conflict checking)
}
```

---

## ⚠️ Important Notes

1. **Database Migration Required**
   - Must run `npx prisma migrate dev` or `npx prisma db push`
   - Don't skip this step!

2. **Backward Compatibility**
   - New enum values are backward compatible
   - Existing trips/tours still work
   - Only new assignments use validator

3. **Authorization**
   - Only `manager` and `admin` roles can assign
   - API checks `locals.user.role`
   - Ensure middleware sets `locals.user`

4. **Audit Trail**
   - All assignments logged to `AuditLog` table
   - Useful for compliance and debugging
   - Review logs: `SELECT * FROM "AuditLog" WHERE entityType = 'Trip'`

---

## 📚 Quick Reference

### Most Used Functions

```typescript
// Check if driver is available
import { checkAssignmentConflict } from '$lib/server/assignments/conflict-checker';
const conflict = await checkAssignmentConflict(driverId, { start, end });

// Assign trip with validation
import { assignTripToDriver } from '$lib/server/assignments/assignment-validator';
const result = await assignTripToDriver(tripId, driverId, userId);

// Find available drivers
import { suggestAvailableDrivers } from '$lib/server/assignments/conflict-checker';
const drivers = await suggestAvailableDrivers({ start, end }, 5);

// Update driver status
import { updateDriverOperationalStatus } from '$lib/server/assignments/conflict-checker';
const status = await updateDriverOperationalStatus(driverId);
```

---

## 🆘 Troubleshooting

**Q: Assignment fails with "Conflicts found"**
A: Driver has overlapping trip/tour. Check dashboard or use `/check-driver-availability` API.

**Q: Driver status not updating**
A: Call `updateDriverOperationalStatus(driverId)` after creating/completing trips.

**Q: Migration fails**
A: Ensure PostgreSQL is running and DATABASE_URL is set correctly.

**Q: API returns 403 Unauthorized**
A: Only manager/admin can assign. Check `locals.user.role` in your auth middleware.

---

## ✨ Success Checklist

- [ ] Schema migration applied successfully
- [ ] API endpoints tested with sample data
- [ ] Conflicts detected correctly
- [ ] Driver suggestions working
- [ ] Assignment status updates working
- [ ] Driver status auto-updates
- [ ] Audit logs created for all assignments
- [ ] UI shows conflict errors to users
- [ ] Deployment complete

---

## 🎯 What This Solves

```
BEFORE (Double-Booking Problem):
10:00 Trip A assigned to John
10:15 Tour B assigned to John
10:30 Trip C assigned to John
→ John is triple-booked! 😱

AFTER (Assignment Engine):
10:00 Trip A assigned to John ✅
10:15 Try Tour B → Conflict detected!
     → Suggest Maria, Peter, Sophie
     → Manager assigns to Maria ✅
10:30 Try Trip C → Conflict detected!
     → Suggest available drivers
→ All assignments conflict-free! 🎉
```

---

Ready to deploy? Let me know if you hit any issues! 🚀
