# Driver Payout System Guide

## Overview

The driver payout system tracks financial transactions between Royal E-Cars and drivers. It calculates platform fees (commission) and driver payouts on a per-trip basis, provides driver earnings reports, and generates accounting summaries.

## Financial Model

```
Trip Fare:           €50.00
─────────────────────────────
Platform Fee (20%):  €10.00  ← Platform/Commission
Driver Payout (80%): €40.00  ← Driver earnings
═════════════════════════════
Total:               €50.00
```

### Configurable Commission

The default platform fee is **20%**, but can be adjusted per-transaction or globally:
- Adjust per-trip: Pass `platformFeePercentage` parameter
- Change default: Modify `PLATFORM_FEE_PERCENTAGE` constant in service

## Database Schema

### Trip Model (Payout Fields)
```prisma
model Trip {
  // ... existing fields ...
  fareAmount       Decimal  @db.Decimal(12, 2)     // Total trip fare
  platformFee      Decimal  @default(0) @db.Decimal(12, 2)    // Platform commission
  driverPayout     Decimal  @default(0) @db.Decimal(12, 2)    // Driver earnings
}
```

**Important:** `platformFee` + `driverPayout` should equal `totalAmount` for completed trips.

## Service Layer Functions

Location: `src/lib/server/payouts/payout-service.ts`

### calculatePayout(fareAmount, platformFeePercentage?)
Calculates payout breakdown without modifying database.

**Parameters:**
- `fareAmount` (Decimal | number) - The fare amount
- `platformFeePercentage` (number, optional, default: 20) - Commission percentage

**Returns:**
```typescript
{
  fareAmount: Decimal;           // Original fare
  platformFeePercentage: number; // Commission percentage used
  platformFee: Decimal;          // Calculated commission amount
  driverPayout: Decimal;         // Calculated driver earnings
}
```

**Example:**
```typescript
const breakdown = calculatePayout(50.00, 20);
console.log(breakdown);
// {
//   fareAmount: Decimal(50),
//   platformFeePercentage: 20,
//   platformFee: Decimal(10),
//   driverPayout: Decimal(40)
// }
```

---

### calculateAndUpdateTripPayout(tripId, platformFeePercentage?)
Updates Trip's `platformFee` and `driverPayout` fields based on `totalAmount`.

**Parameters:**
- `tripId` (BigInt) - Trip to update
- `platformFeePercentage` (number, optional, default: 20) - Commission percentage

**Returns:** Updated Trip object

**Example:**
```typescript
const updated = await calculateAndUpdateTripPayout(BigInt(12345));
console.log(`Driver earns: €${updated.driverPayout}`);
```

**When to Use:**
- When creating a new trip with a final amount
- When updating trip total amount
- As part of payment processing workflow

---

### getDriverEarnings(driverId, startDate?, endDate?)
Gets cumulative earnings for a driver in a date range.

**Parameters:**
- `driverId` (BigInt) - Driver's ID
- `startDate` (Date, optional) - Range start (inclusive)
- `endDate` (Date, optional) - Range end (inclusive)

**Returns:**
```typescript
{
  totalTrips: number;              // Count of completed trips
  totalGrossRevenue: Decimal;      // Sum of all fares
  totalPlatformFees: Decimal;      // Sum of platform commissions
  totalEarnings: Decimal;          // Sum of driver payouts
  averagePerTrip: Decimal;         // Average payout per trip
}
```

**Example:**
```typescript
// Get September earnings
const start = new Date('2026-09-01');
const end = new Date('2026-09-30');
const earnings = await getDriverEarnings(BigInt(456), start, end);

console.log(`Trips completed: ${earnings.totalTrips}`);
console.log(`Gross revenue: €${earnings.totalGrossRevenue}`);
console.log(`Driver earnings: €${earnings.totalEarnings}`);
console.log(`Average per trip: €${earnings.averagePerTrip}`);
```

---

### getPlatformRevenue(startDate?, endDate?)
Gets platform-wide revenue, commissions, and payouts for a date range.

**Parameters:**
- `startDate` (Date, optional) - Range start
- `endDate` (Date, optional) - Range end

**Returns:**
```typescript
{
  totalTrips: number;              // Total trips completed
  totalGrossRevenue: Decimal;      // Total revenue across all trips
  totalPlatformFees: Decimal;      // Total platform commissions earned
  totalDriverPayouts: Decimal;     // Total paid to drivers
  platformMarginPercent: number;   // Effective platform margin %
}
```

**Example:**
```typescript
// Get October statistics
const october = {
  start: new Date('2026-10-01'),
  end: new Date('2026-10-31T23:59:59')
};

const revenue = await getPlatformRevenue(october.start, october.end);

console.log(`Platform earned: €${revenue.totalPlatformFees}`);
console.log(`Paid to drivers: €${revenue.totalDriverPayouts}`);
console.log(`Margin: ${revenue.platformMarginPercent.toFixed(1)}%`);
```

---

### getTopEarners(limit?, startDate?, endDate?)
Gets highest-earning drivers for a period.

**Parameters:**
- `limit` (number, optional, default: 10) - Maximum results (capped at 100)
- `startDate` (Date, optional) - Range start
- `endDate` (Date, optional) - Range end

**Returns:** Array of:
```typescript
{
  driverId: BigInt;
  driverName: string;
  totalTrips: number;
  totalEarnings: Decimal;
  averagePerTrip: Decimal;
}
```

Sorted by `totalEarnings` descending.

**Example:**
```typescript
// Top 5 earners this month
const topEarners = await getTopEarners(5);

topEarners.forEach(driver => {
  console.log(`${driver.driverName}: ${driver.totalTrips} trips, €${driver.totalEarnings}`);
});
```

---

### generatePayoutReport(startDate, endDate)
Generates detailed payout report for accounting/invoicing.

**Parameters:**
- `startDate` (Date, required) - Report period start
- `endDate` (Date, required) - Report period end

**Returns:**
```typescript
{
  reportPeriod: { startDate, endDate };
  driverPayouts: Array<{
    driverId: BigInt;
    driverName: string;
    driverPhone: string;
    trips: Array<{
      tripId: BigInt;
      date: DateTime;
      grossRevenue: Decimal;
      platformFee: Decimal;
      driverPayout: Decimal;
    }>;
    totalGrossRevenue: Decimal;
    totalPlatformFees: Decimal;
    totalPayout: Decimal;
  }>;
  summary: {
    totalTrips: number;
    totalGrossRevenue: Decimal;
    totalPlatformFees: Decimal;
    totalDriverPayouts: Decimal;
  };
}
```

**Example:**
```typescript
// Generate November accounting report
const report = await generatePayoutReport(
  new Date('2026-11-01'),
  new Date('2026-11-30T23:59:59')
);

// Export to CSV or send to accounting system
console.log(`Summary for ${report.reportPeriod.startDate.toISOString()}`);
console.log(`Total trips: ${report.summary.totalTrips}`);
console.log(`Platform revenue: €${report.summary.totalPlatformFees}`);

report.driverPayouts.forEach(driver => {
  console.log(`\n${driver.driverName}:`);
  driver.trips.forEach(trip => {
    console.log(`  Trip ${trip.tripId}: €${trip.driverPayout}`);
  });
  console.log(`  Total: €${driver.totalPayout}`);
});
```

---

## REST API Endpoints

### GET /api/payouts/stats
Get platform-wide revenue statistics.

**Permissions:** admin, manager only

**Query Parameters:**
- `startDate` (string, YYYY-MM-DD) - Optional range start
- `endDate` (string, YYYY-MM-DD) - Optional range end

**Example Requests:**
```bash
# Current month stats
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/payouts/stats"

# October statistics
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/payouts/stats?startDate=2026-10-01&endDate=2026-10-31"
```

**Example Response:**
```json
{
  "totalTrips": 156,
  "totalGrossRevenue": "7800.00",
  "totalPlatformFees": "1560.00",
  "totalDriverPayouts": "6240.00",
  "platformMarginPercent": 20.0
}
```

---

### GET /api/drivers/[id]/payouts
Get driver earnings and payout information.

**Permissions:**
- Admin/Manager: Can view any driver
- Driver: Can only view own data

**Query Parameters:**
- `startDate` (string, YYYY-MM-DD) - Optional range start
- `endDate` (string, YYYY-MM-DD) - Optional range end

**Example Requests:**
```bash
# Driver checking own earnings
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/drivers/456/payouts"

# September earnings for driver
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/drivers/456/payouts?startDate=2026-09-01&endDate=2026-09-30"

# Manager viewing driver's earnings
curl -H "Cookie: sb-access-token=..." \
  "http://localhost:5173/api/drivers/789/payouts?startDate=2026-09-01"
```

**Example Response:**
```json
{
  "driverId": "456",
  "totalTrips": 42,
  "totalGrossRevenue": "2100.00",
  "totalPlatformFees": "420.00",
  "totalEarnings": "1680.00",
  "averagePerTrip": "40.00"
}
```

---

## Implementation Workflow

### Step 1: Create Trip with Payout Calculation

When creating a trip (in booking or trip creation endpoint):

```typescript
import { calculatePayout } from '$lib/server/payouts/payout-service';

// Calculate payout breakdown
const payout = calculatePayout(50.00, 20); // €50 fare with 20% commission

// Create trip in database
const trip = await prisma.trip.create({
  data: {
    // ... other trip fields ...
    totalAmount: 50.00,
    platformFee: payout.platformFee,    // €10
    driverPayout: payout.driverPayout   // €40
  }
});
```

---

### Step 2: Update Trip Amount and Recalculate

When trip amount changes (e.g., due to adjustment, discount):

```typescript
import { calculateAndUpdateTripPayout } from '$lib/server/payouts/payout-service';

// Update trip total amount
await prisma.trip.update({
  where: { id: tripId },
  data: { totalAmount: newAmount }
});

// Recalculate payouts
await calculateAndUpdateTripPayout(tripId, 20);
```

---

### Step 3: Query Driver Earnings

Display earnings in driver dashboard:

```typescript
import { getDriverEarnings } from '$lib/server/payouts/payout-service';

// Get current month earnings
const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const earnings = await getDriverEarnings(driverId, monthStart, monthEnd);
```

---

### Step 4: Generate Accounting Report

For monthly invoicing or payout processing:

```typescript
import { generatePayoutReport } from '$lib/server/payouts/payout-service';

const report = await generatePayoutReport(
  new Date('2026-11-01'),
  new Date('2026-11-30T23:59:59')
);

// Export to CSV or database for payment processing
exportToAccounting(report);
```

---

## Frontend Integration

### Driver Dashboard Component

Display driver's earnings for current period:

```svelte
<script lang="ts">
  export let driverId: string;
  
  let earnings = null;
  let loading = true;
  
  onMount(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];
    
    const response = await fetch(
      `/api/drivers/${driverId}/payouts?startDate=${monthStart}&endDate=${monthEnd}`
    );
    earnings = await response.json();
    loading = false;
  });
</script>

{#if loading}
  <p>Loading earnings...</p>
{:else if earnings}
  <div class="earnings-card">
    <h3>This Month's Earnings</h3>
    <div class="stat">
      <span class="label">Trips Completed</span>
      <span class="value">{earnings.totalTrips}</span>
    </div>
    <div class="stat">
      <span class="label">Gross Revenue</span>
      <span class="value">€{Number(earnings.totalGrossRevenue).toFixed(2)}</span>
    </div>
    <div class="stat highlight">
      <span class="label">Your Earnings</span>
      <span class="value">€{Number(earnings.totalEarnings).toFixed(2)}</span>
    </div>
    <div class="stat">
      <span class="label">Average per Trip</span>
      <span class="value">€{Number(earnings.averagePerTrip).toFixed(2)}</span>
    </div>
  </div>
{/if}

<style>
  .earnings-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    margin: 15px 0;
  }
  
  .stat.highlight {
    background: #f0f8ff;
    padding: 10px;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .value {
    text-align: right;
  }
</style>
```

---

## Validation & Constraints

### Financial Integrity

Ensure payout fields are always consistent:

```typescript
// Validate trip before marking complete
async function validateTripFinances(trip: Trip) {
  const expectedTotal = trip.platformFee.plus(trip.driverPayout);
  
  if (!trip.totalAmount.equals(expectedTotal)) {
    throw new Error(
      `Financial mismatch: totalAmount €${trip.totalAmount} ≠ ` +
      `fees (€${trip.platformFee}) + payout (€${trip.driverPayout})`
    );
  }
}
```

### Commission Constraints

The platform commission should remain within reasonable bounds:

```typescript
const MIN_COMMISSION_PERCENT = 10;  // Minimum 10%
const MAX_COMMISSION_PERCENT = 40;  // Maximum 40%

function validateCommissionPercent(percent: number) {
  if (percent < MIN_COMMISSION_PERCENT || percent > MAX_COMMISSION_PERCENT) {
    throw new Error(
      `Commission must be between ${MIN_COMMISSION_PERCENT}% and ${MAX_COMMISSION_PERCENT}%`
    );
  }
}
```

---

## Reporting Formats

### CSV Export

For integration with accounting software:

```typescript
function generateCSV(report: PayoutReport): string {
  let csv = 'Date,Driver,Trips,Gross Revenue,Platform Fee,Driver Payout\n';
  
  report.driverPayouts.forEach(driver => {
    driver.trips.forEach(trip => {
      csv += [
        trip.date.toISOString().split('T')[0],
        driver.driverName,
        1,
        trip.grossRevenue,
        trip.platformFee,
        trip.driverPayout
      ].join(',') + '\n';
    });
  });
  
  return csv;
}
```

### JSON Export

For API integrations or archival:

```typescript
function exportJSON(report: PayoutReport) {
  return JSON.stringify(report, (key, value) => {
    // Convert Decimal to string
    if (value && value.constructor.name === 'Decimal') {
      return value.toString();
    }
    return value;
  }, 2);
}
```

---

## Troubleshooting

### Payout Fields Are Null

**Problem:** Trips created without calculating payouts.

**Solution:**
```typescript
// Find all trips with null payouts
const unset = await prisma.trip.findMany({
  where: {
    OR: [
      { platformFee: null },
      { driverPayout: null }
    ]
  }
});

// Recalculate payouts for all
for (const trip of unset) {
  await calculateAndUpdateTripPayout(trip.id);
}
```

### Inconsistent Financial Totals

**Problem:** `platformFee + driverPayout ≠ totalAmount`

**Solution:**
```typescript
// Audit and fix
const trips = await prisma.trip.findMany();

for (const trip of trips) {
  const sum = trip.platformFee.plus(trip.driverPayout);
  if (!sum.equals(trip.totalAmount)) {
    console.warn(
      `Trip ${trip.id}: €${trip.totalAmount} ≠ €${sum}`
    );
    // Recalculate
    await calculateAndUpdateTripPayout(trip.id);
  }
}
```

### Performance with Large Datasets

Use date range filtering to limit queries:

```typescript
// ❌ Too slow - entire table
const allEarnings = await getDriverEarnings(driverId);

// ✅ Efficient - limited range
const thisMonth = {
  start: new Date(2026, 10, 1),
  end: new Date(2026, 10, 31, 23, 59, 59)
};
const thisMonthEarnings = await getDriverEarnings(driverId, thisMonth.start, thisMonth.end);
```

---

## Tax & Compliance

### Austria-Specific Considerations

1. **Selbstständiger (Self-Employed) Tax**
   - Drivers may be classified as independent contractors
   - Royal E-Cars should issue payout statements (Leistungsaufstellung)
   - Document payout breakdown: gross + commission + net

2. **VAT (Mehrwertsteuer)**
   - Trip fares already include 20% VAT
   - Driver payouts do NOT include additional VAT
   - Platform fees may be subject to VAT depending on contract

3. **Reporting**
   - Generate monthly payout reports for tax records
   - Keep detailed trip-by-trip breakdowns
   - Archive reports for minimum 7 years per Austrian tax law

### Payout Statement Generation

```typescript
export async function generatePayoutStatement(
  driverId: BigInt,
  year: number,
  month: number
): Promise<string> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  
  const earnings = await getDriverEarnings(driverId, start, end);
  
  return `
Leistungsaufstellung / Payout Statement
Royal E-Cars Vienna
Date: ${new Date().toLocaleDateString('de-AT')}
Period: ${start.toLocaleDateString('de-AT')} - ${end.toLocaleDateString('de-AT')}

Driver Payout Details:
─────────────────────────
Completed Trips:     ${earnings.totalTrips}
Total Fare Revenue:  €${earnings.totalGrossRevenue}
Platform Commission: €${earnings.totalPlatformFees}
Your Net Payout:     €${earnings.totalEarnings}

Average per Trip:    €${earnings.averagePerTrip}

Payment is due within 14 days.
TAX ID: [Royal E-Cars Steuernummer]
  `;
}
```

---

## Performance Tuning

### Recommended Indexes

```sql
-- Trip model indexes for payout queries
CREATE INDEX idx_trip_driver_completed 
  ON "Trip"(driverId, status) 
  WHERE status = 'completed';

CREATE INDEX idx_trip_date_status 
  ON "Trip"(startTime, status);

-- For analytics
CREATE INDEX idx_trip_payout_dates 
  ON "Trip"(startTime, driverId, platformFee, driverPayout);
```

### Query Optimization

```typescript
// ❌ Inefficient - joins every relation
const trips = await prisma.trip.findMany({
  include: {
    driver: true,
    customer: true,
    payments: true
  }
});

// ✅ Efficient - select only needed fields
const trips = await prisma.trip.findMany({
  where: { status: 'completed' },
  select: {
    id: true,
    totalAmount: true,
    platformFee: true,
    driverPayout: true,
    startTime: true
  },
  take: 1000
});
```
