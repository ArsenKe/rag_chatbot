# Assignment Engine - Double-Booking Prevention

## Overview

The Assignment Engine prevents drivers from being double-booked by checking for conflicts before assigning trips or city tours.

**It checks against:**
- ✅ Existing trips (time overlap)
- ✅ Existing city tours (time overlap)
- ✅ Driver availability blocks (when marked unavailable)
- ✅ Google Calendar (ready for future integration)

---

## Architecture

### Core Files

```
webapp/src/lib/server/assignments/
├── conflict-checker.ts      # Core conflict detection logic
└── assignment-validator.ts  # Validation & assignment operations

webapp/src/routes/api/trips/[id]/
└── +server.ts              # Trip assignment endpoints
```

### Schema Changes

**New Driver Statuses:**
```
active     - Available for assignment
offline    - Not working
on_trip    - Currently driving
on_tour    - Currently on city tour
vacation   - Time off
suspended  - Deactivated
```

**New Booking Statuses:**
```
draft       - Temporary, not confirmed
reserved    - Customer confirmed
assigned    - Manager assigned driver
confirmed   - Driver accepted
in_progress - Trip started
completed   - Trip finished
no_show     - Customer didn't appear
cancelled   - Cancelled
```

**New Fields:**
- `Driver.statusUpdatedAt` - timestamp of last status change
- `CityTour.scheduledStartAt` - planned start (for conflicts)
- `CityTour.scheduledEndAt` - planned end (for conflicts)

---

## Usage

### 1. Check if Driver Can Be Assigned

```typescript
import { checkAssignmentConflict } from '$lib/server/assignments/conflict-checker';

const conflict = await checkAssignmentConflict(driverId, {
  start: new Date('2024-10-15 10:00'),
  end: new Date('2024-10-15 11:00')
});

if (conflict.hasConflict) {
  console.log('Conflicts found:');
  conflict.conflicts.forEach(c => {
    console.log(`- ${c.type}: ${c.description}`);
    console.log(`  ${c.startTime} to ${c.endTime}`);
  });
} else {
  console.log('Driver is available!');
}
```

### 2. Assign Trip to Driver (with validation)

```typescript
import { assignTripToDriver } from '$lib/server/assignments/assignment-validator';

const result = await assignTripToDriver(
  tripId,
  driverId,
  currentUserIdWhoMadeTheAssignment
);

if (result.success) {
  console.log('Trip assigned:', result.trip);
} else {
  console.log('Assignment failed:', result.error);
}
```

### 3. Use API Endpoint

**Assign trip to driver:**
```bash
POST /api/trips/[tripId]/assign
Content-Type: application/json

{
  "tripId": "123",
  "driverId": "456"
}

Response (success):
{
  "success": true,
  "message": "Trip assigned successfully",
  "trip": { ... }
}

Response (conflict):
{
  "error": "Conflicts found: trip: Trip from Vienna to Airport; tour: gold city tour with 4 guests"
}
```

**Check driver availability:**
```bash
GET /api/trips/[tripId]/check-driver-availability?driverId=456

Response:
{
  "available": false,
  "conflicts": [
    {
      "type": "trip",
      "id": "789",
      "startTime": "2024-10-15T10:00:00Z",
      "endTime": "2024-10-15T11:00:00Z",
      "description": "Trip from Vienna to Airport"
    }
  ]
}
```

**Reject assignment:**
```bash
DELETE /api/trips/[tripId]/assignment
Content-Type: application/json

{
  "tripId": "123",
  "reason": "Driver called in sick"
}

Response:
{
  "success": true,
  "message": "Assignment rejected"
}
```

### 4. Get Available Time Slots

```typescript
import { getDriverAvailableSlots } from '$lib/server/assignments/conflict-checker';

const slots = await getDriverAvailableSlots(
  driverId,
  new Date('2024-10-15'),
  60 // slot duration in minutes
);

slots.forEach(slot => {
  console.log(`Available: ${slot.start} to ${slot.end}`);
});
```

### 5. Update Driver Status Automatically

```typescript
import { updateDriverOperationalStatus } from '$lib/server/assignments/conflict-checker';

const newStatus = await updateDriverOperationalStatus(driverId);
// Returns: 'active' | 'on_trip' | 'on_tour'
```

### 6. Suggest Available Drivers

```typescript
import { suggestAvailableDrivers } from '$lib/server/assignments/conflict-checker';

const suggestions = await suggestAvailableDrivers(
  {
    start: new Date('2024-10-15 10:00'),
    end: new Date('2024-10-15 11:00')
  },
  5 // top 5 drivers
);

// Returns: [
//   { driverId: 1, name: 'John', status: 'active', conflictCount: 0 },
//   { driverId: 2, name: 'Maria', status: 'active', conflictCount: 1 },
//   ...
// ]
```

---

## Workflow Examples

### Manager Assigns Trip to Driver

```
1. Manager selects trip from dashboard
2. System fetches trip details (start/end time)
3. Manager clicks "Suggest Drivers"
4. System calls suggestAvailableDrivers()
5. Manager selects driver from list
6. System calls POST /api/trips/[id]/assign
7. System validates via assignTripToDriver()
   - Checks conflicts
   - Updates Trip.status = 'assigned'
   - Updates Driver.status (automatic)
8. Driver receives notification
9. Driver accepts/rejects in mobile app
10. Trip.status becomes 'confirmed' or reverts to 'reserved'
```

### Driver Becomes Unavailable

```
1. Driver gets sick/has emergency
2. Driver marks self as "offline" in app
3. Driver.status = 'offline'
4. System auto-updates all their pending assignments
5. Manager can see which trips need reassignment
```

### Conflict Detection in Action

**Without Assignment Engine (OLD):**
```
10:00-11:00: Trip A (Vienna → Airport) assigned to John
10:15-11:15: City Tour booked for John (tourist group)
10:30-11:30: Trip B (Hotel → Station) assigned to John
→ DISASTER: John triple-booked!
```

**With Assignment Engine (NEW):**
```
10:00-11:00: Trip A assigned to John ✅ OK
10:15-11:15: Try to assign Tour to John
  → System checks conflicts
  → Finds: Trip A (10:00-11:00) overlaps with Tour (10:15-11:15)
  → Rejects assignment
  → Suggests: Maria (available), Peter (1 conflict), Sophie (2 conflicts)
→ Manager assigns to Maria ✅
10:30-11:30: Try to assign Trip B to John
  → Finds: Trip A still running
  → Rejects, suggests other drivers
```

---

## Database Schema Updates

Run migration:
```bash
# Generate migration
npm run db:push

# Or manually:
npx prisma migrate dev --name add_assignment_engine
```

**Migration includes:**
1. DriverStatus enum update
2. BookingStatus enum update
3. Driver.statusUpdatedAt field
4. CityTour.scheduledStartAt field
5. CityTour.scheduledEndAt field
6. Index updates

---

## Testing

### Unit Test Example

```typescript
import { checkAssignmentConflict } from '$lib/server/assignments/conflict-checker';

describe('Assignment Engine', () => {
  it('should detect trip conflicts', async () => {
    const conflict = await checkAssignmentConflict(driverId, {
      start: new Date('2024-10-15 10:00'),
      end: new Date('2024-10-15 11:00')
    });

    expect(conflict.hasConflict).toBe(true);
    expect(conflict.conflicts[0].type).toBe('trip');
  });

  it('should allow assignment with no conflicts', async () => {
    const conflict = await checkAssignmentConflict(driverId, {
      start: new Date('2024-10-15 05:00'),
      end: new Date('2024-10-15 06:00')
    });

    expect(conflict.hasConflict).toBe(false);
  });
});
```

### Integration Test

```bash
# Create test data
npm run db:seed

# Test assignment
curl -X POST http://localhost:5173/api/trips/1/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tripId": "1", "driverId": "1"}'
```

---

## Future Enhancements

### Phase 2
- [ ] Google Calendar integration (fetch driver's personal calendar)
- [ ] Geolocation-based conflict checking (travel time between locations)
- [ ] Driver preference profiles (avoid back-to-back trips, prefer long rides, etc.)
- [ ] Automatic assignment suggestions with ML ranking

### Phase 3
- [ ] Real-time conflict monitoring
- [ ] Automatic reassignment if trip changes
- [ ] Driver fatigue detection (max hours per day)
- [ ] Regulatory break requirements (EU driving hours)

---

## Error Handling

```typescript
try {
  const result = await assignTripToDriver(tripId, driverId, userId);
  if (!result.success) {
    // Expected error (conflict, driver suspended, etc)
    showUserMessage(result.error);
  } else {
    // Success
    refreshTripList();
  }
} catch (error) {
  // Unexpected error (DB crash, etc)
  logError(error);
  showErrorBoundary();
}
```

---

## Performance Notes

- ✅ Indexed queries for fast conflict detection
- ✅ Uses transaction for atomic assignment
- ✅ Caching-ready for Redis integration
- ⚠️ Large driver fleets (1000+) may need query optimization
- 🚀 Consider adding caching layer for availability lookups

---

## Compliance & Audit

All assignments are logged in AuditLog:
```
{
  actorUserId: "manager-123",
  action: "assigned",
  entityType: "Trip",
  entityId: "trip-456",
  newValue: { driverId: "driver-789", status: "assigned" }
}
```

---

## Support

For issues or questions, check:
- `conflict-checker.ts` - Core logic documentation
- `assignment-validator.ts` - Validation flow
- `/api/trips/[id]/+server.ts` - API endpoint implementation
