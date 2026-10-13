# Quick Fix Guide: Priority 2 Issues

## Issue #1: Customer Notification Bug - FIX NOW ⚠️

### The Problem
Customers can't receive notifications because there's no way to map `customerId` (BigInt) → `User.id` (UUID string).

### The Fix (5 minutes)

#### Step 1: Update Prisma Schema
Edit `prisma/schema.prisma`:

**Find this:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      Role
  passwordHash String?
  driverId  BigInt?
  createdAt DateTime @default(now())
  notifications Notification[]
}
```

**Replace with:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      Role
  passwordHash String?
  driverId  BigInt?
  customerId BigInt?  // ADD THIS LINE
  createdAt DateTime @default(now())
  notifications Notification[]
}
```

**Find this:**
```prisma
model Customer {
  id               BigInt    @id @default(autoincrement())
  name             String
  email            String?
  phone            String?
  address          String?
  driverLicense    String?
  registrationDate DateTime?
  bookings         Booking[]
  trips            Trip[]
  invoices         Invoice[]
}
```

**Replace with:**
```prisma
model Customer {
  id               BigInt    @id @default(autoincrement())
  name             String
  email            String?
  phone            String?
  address          String?
  driverLicense    String?
  registrationDate DateTime?
  userId           String?   // ADD THIS LINE
  bookings         Booking[]
  trips            Trip[]
  invoices         Invoice[]
  
  user User? @relation(fields: [userId], references: [id])  // ADD THIS LINE
}
```

#### Step 2: Fix notification-service.ts

Find this (around line 213):
```typescript
const customerUser = await prisma.user.findFirst({
  where: { id: customerId.toString() }  // WRONG
});
```

Replace with:
```typescript
const customerUser = await prisma.user.findFirst({
  where: { customerId: customerId }  // CORRECT - use BigInt
});
```

Find this (around line 301):
```typescript
const customerUser = await prisma.user.findFirst({
  where: { id: customerId.toString() }  // WRONG
});
```

Replace with:
```typescript
const customerUser = await prisma.user.findFirst({
  where: { customerId: customerId }  // CORRECT - use BigInt
});
```

#### Step 3: Run Migration
```bash
cd webapp
npx prisma migrate dev --name add_customer_to_user
# OR if not using migrations, just:
# npx prisma db push
```

#### Step 4: Test
```typescript
// Quick test in a script or API endpoint:
const { notifyTripEvent } = require('./src/lib/server/notifications/notification-service');

// Create test customer with user
const user = await prisma.user.create({
  data: {
    email: 'customer@test.com',
    role: 'customer',
    customerId: 123n
  }
});

// Now customer notifications should work
await notifyTripEvent(456n, 123n, 789n, 'assigned');

// Verify notification created
const notif = await prisma.notification.findFirst({
  where: { userId: user.id }
});
console.log('Notification created:', notif);
```

---

## Issue #2: Payout Stats Routing - FIX AFTER Issue #1

### The Problem
Top-earners endpoint isn't properly routed in SvelteKit

### The Fix (10 minutes)

#### Step 1: Create New File
Create: `src/routes/api/payouts/top-earners/+server.ts`

```typescript
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';
import { getTopEarners } from '$lib/server/payouts/payout-service';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    
    const limitStr = url.searchParams.get('limit') || '10';
    const startStr = url.searchParams.get('start');
    const endStr = url.searchParams.get('end');
    
    const limit = Math.min(Math.max(parseInt(limitStr), 1), 100);
    const start = startStr ? new Date(startStr) : undefined;
    const end = endStr ? new Date(endStr) : undefined;
    
    const earners = await getTopEarners(limit, start, end);
    
    return json(earners);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching top earners:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
```

#### Step 2: Clean Up Old File
In `src/routes/api/payouts/stats/+server.ts`, remove the top-earners handling code if it exists.

Keep only the main stats endpoint:
```typescript
export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);
    // ... only stats code here
  }
}
```

#### Step 3: Test Endpoints
```bash
# Test stats endpoint
curl http://localhost:5173/api/payouts/stats

# Test top-earners endpoint  
curl http://localhost:5173/api/payouts/top-earners?limit=5

# Both should return 200 with proper data
```

---

## Verification Checklist

After applying fixes:

- [ ] Schema has `User.customerId: BigInt?`
- [ ] Schema has `Customer.userId: String?` with relationship
- [ ] `npx prisma db push` succeeds
- [ ] notification-service.ts uses `customerId` for customer lookup
- [ ] notification-service.ts uses `driverId` for driver lookup
- [ ] `/api/payouts/stats` returns 200 with platform revenue
- [ ] `/api/payouts/top-earners` returns 200 with top drivers
- [ ] `/api/drivers/[id]/payouts` returns driver earnings
- [ ] Customer receives notification when trip is assigned
- [ ] Driver receives notification when trip is assigned
- [ ] Payment notification sent and received

---

## Testing Commands

```bash
# From webapp directory

# 1. Run migration
npm run db:push
# OR
npx prisma db push

# 2. Test notification creation
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const notif = await prisma.notification.create({
    data: {
      userId: 'user-uuid-here',
      type: 'trip_assigned',
      title: 'Test',
      message: 'Test notification'
    }
  });
  console.log('✅ Notification created:', notif);
  process.exit(0);
}

test().catch(err => { console.error(err); process.exit(1); });
"

# 3. Test payout calculation
node -e "
const { Decimal } = require('@prisma/client/runtime/library');
const fare = new Decimal('100.00');
const percent = 20;
const platformFee = fare.times(new Decimal(percent).dividedBy(100));
const driverPayout = fare.minus(platformFee);
console.log('✅ Fare:', fare.toString());
console.log('✅ Platform Fee (20%):', platformFee.toString());
console.log('✅ Driver Payout:', driverPayout.toString());
"

# 4. Start dev server and test endpoints
npm run dev

# In another terminal:
# GET /api/notifications - should return your notifications
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5173/api/notifications

# GET /api/payouts/stats - admin/manager only
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5173/api/payouts/stats

# GET /api/payouts/top-earners - admin/manager only
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5173/api/payouts/top-earners
```

---

## Rollback Plan (If Something Goes Wrong)

```bash
# Undo migration
npx prisma migrate resolve --rolled-back "add_customer_to_user"
# Or revert to previous schema version

# Remove new files
rm src/routes/api/payouts/top-earners/+server.ts

# Reset schema to original
git checkout prisma/schema.prisma
npx prisma db push
```

---

## Next Steps After Fixes

1. ✅ Apply both fixes above
2. ✅ Run migration
3. ✅ Test all endpoints
4. Create integration test file: `tests/integration/notifications-payouts.test.ts`
5. Deploy to staging environment
6. User acceptance testing
7. Deploy to production

---

**Estimated Time:** 15 minutes for all fixes
**Risk Level:** Low (additive schema changes only, backward compatible)
**Rollback Difficulty:** Easy (just reverse migrations and file deletion)
