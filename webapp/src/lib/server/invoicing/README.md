# Invoice System - Austrian Tax Compliance

## Overview

The invoice system automatically generates, tracks, and manages invoices for all trips. It's designed for Austrian tax compliance with automatic VAT calculation (20%).

**Key Features:**
- ✅ Automatic invoice number generation (INV-YYYY-XXXXXX)
- ✅ 20% VAT calculation (Austrian standard)
- ✅ Automatic due date (14 days from issue)
- ✅ Status tracking (draft → issued → paid/overdue)
- ✅ Audit logging of all invoice actions
- ✅ Overdue invoice detection

---

## Database Schema

```prisma
enum InvoiceStatus {
  draft      // Created but not sent
  issued     // Sent to customer
  paid       // Payment received
  overdue    // Past due date, not paid
}

model Invoice {
  id              BigInt         @id @default(autoincrement())
  invoiceNumber   String         @unique
  tripId          BigInt
  customerId      BigInt
  amount          Decimal        @db.Decimal(12, 2)    // Net amount
  vat             Decimal        @db.Decimal(12, 2)    // 20% VAT
  totalAmount     Decimal        @db.Decimal(12, 2)    // Net + VAT
  status          InvoiceStatus  @default(draft)
  issuedAt        DateTime
  dueAt           DateTime
  paidAt          DateTime?
  notes           String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  trip      Trip      @relation(fields: [tripId], references: [id])
  customer  Customer  @relation(fields: [customerId], references: [id])

  @@index([status, issuedAt])
  @@index([customerId, status])
  @@index([invoiceNumber])
}
```

---

## Usage

### Creating an Invoice

**Service Method:**
```typescript
import { createInvoice } from '$lib/server/invoicing/invoice-service';

const invoice = await createInvoice({
  tripId: BigInt(123),
  customerId: BigInt(456),
  amount: 50.00,  // Optional - uses trip.totalAmount if omitted
  vat: 10.00,     // Optional - calculated as 20% of amount if omitted
  notes: 'Business trip to Vienna'
});

// Returns:
// {
//   id: 789n,
//   invoiceNumber: 'INV-2024-000001',
//   tripId: 123n,
//   customerId: 456n,
//   amount: 50.00,
//   vat: 10.00,
//   totalAmount: 60.00,
//   status: 'draft',
//   issuedAt: 2024-10-13T...,
//   dueAt: 2024-10-27T...,  // 14 days later
//   notes: 'Business trip to Vienna'
// }
```

**API Endpoint:**
```bash
POST /api/invoices
Content-Type: application/json

{
  "tripId": "123",
  "customerId": "456",
  "amount": 50.00,
  "notes": "Business trip"
}

Response:
{
  "data": {
    "id": "789",
    "invoiceNumber": "INV-2024-000001",
    ...
  }
}
```

---

### Issuing an Invoice

Changes status from `draft` to `issued` (when sending to customer).

**Service Method:**
```typescript
import { issueInvoice } from '$lib/server/invoicing/invoice-service';

const invoice = await issueInvoice(BigInt(789));
// Sets: status = 'issued', issuedAt = now()
```

**API Endpoint:**
```bash
POST /api/invoices/789?action=issue

Response:
{
  "data": {
    "id": "789",
    "status": "issued",
    "issuedAt": "2024-10-13T10:00:00Z",
    ...
  }
}
```

---

### Marking as Paid

```typescript
import { markInvoiceAsPaid } from '$lib/server/invoicing/invoice-service';

const invoice = await markInvoiceAsPaid(BigInt(789));
// Sets: status = 'paid', paidAt = now()

// Or with specific payment date:
const invoice = await markInvoiceAsPaid(
  BigInt(789),
  new Date('2024-10-15')
);
```

**API Endpoint:**
```bash
POST /api/invoices/789?action=pay&paidAt=2024-10-15

Response:
{
  "data": {
    "id": "789",
    "status": "paid",
    "paidAt": "2024-10-15T00:00:00Z",
    ...
  }
}
```

---

### Updating Invoice (Draft Only)

Only draft invoices can be updated.

```typescript
import { updateInvoice } from '$lib/server/invoicing/invoice-service';

const updated = await updateInvoice(BigInt(789), {
  amount: 55.00,      // Update amount
  vat: 11.00,         // Update VAT
  notes: 'Updated notes',
  dueAt: new Date('2024-10-29')
});
```

**API Endpoint:**
```bash
PUT /api/invoices/789
Content-Type: application/json

{
  "amount": 55.00,
  "notes": "Updated invoice"
}
```

---

### Retrieving Invoices

**Get Single Invoice:**
```typescript
import { getInvoice } from '$lib/server/invoicing/invoice-service';

const invoice = await getInvoice(BigInt(789));
```

**Get Customer Invoices:**
```typescript
import { getCustomerInvoices } from '$lib/server/invoicing/invoice-service';

// All invoices for customer
const invoices = await getCustomerInvoices(BigInt(456));

// Only unpaid invoices
const unpaid = await getCustomerInvoices(BigInt(456), 'issued');
```

**Get All Invoices (with filtering):**
```typescript
import { getAllInvoices } from '$lib/server/invoicing/invoice-service';

const result = await getAllInvoices(
  'issued',  // Optional status filter
  0,         // skip (pagination)
  50         // take (pagination)
);

// Returns: { invoices: [...], total: 150 }
```

**API Endpoints:**
```bash
# Get single invoice
GET /api/invoices/789

# Get all invoices
GET /api/invoices?status=issued&skip=0&take=50

# Get customer invoices
GET /api/invoices?customerId=456&status=paid

# Get statistics
GET /api/invoices/stats
```

---

### Statistics

```typescript
import { getInvoiceStats } from '$lib/server/invoicing/invoice-service';

const stats = await getInvoiceStats();
// Returns:
// {
//   total: 150,              // Total invoices
//   draft: 10,               // Unsent
//   issued: 50,              // Sent, awaiting payment
//   paid: 80,                // Paid
//   overdue: 10,             // Past due date
//   totalRevenue: 7500.00,   // Sum of all net amounts
//   totalVAT: 1500.00,       // Sum of all VAT
//   totalOutstanding: 3600.00 // (issued + overdue) total amounts
// }
```

**API Endpoint:**
```bash
GET /api/invoices/stats

Response:
{
  "data": {
    "total": 150,
    "draft": 10,
    "issued": 50,
    "paid": 80,
    "overdue": 10,
    "totalRevenue": 7500.00,
    "totalVAT": 1500.00,
    "totalOutstanding": 3600.00
  }
}
```

---

### Checking Overdue Invoices

Should be run daily (e.g., via cron job or scheduled task).

```typescript
import { checkAndUpdateOverdueInvoices } from '$lib/server/invoicing/invoice-service';

const count = await checkAndUpdateOverdueInvoices();
// Finds all invoices with:
//   - status = 'issued'
//   - dueAt < today
// Updates them to status = 'overdue'
// Returns: count of updated invoices
```

**API Endpoint:**
```bash
POST /api/invoices/stats?action=check-overdue
Authorization: Bearer [admin-token]

Response:
{
  "data": {
    "message": "Updated 5 invoices to overdue status",
    "count": 5
  }
}
```

---

## Invoice Number Generation

Automatically generates unique invoice numbers in format: **INV-YYYY-XXXXXX**

Examples:
- `INV-2024-000001` (first invoice of 2024)
- `INV-2024-000152` (152nd invoice of 2024)
- `INV-2025-000001` (first invoice of 2025)

The sequence resets yearly for better organization.

---

## VAT Calculation

**Austrian Standard VAT: 20%**

Examples:
```
Net Amount:    €100.00
VAT (20%):     €20.00
Total:         €120.00
──────────────────────

Net Amount:    €50.00
VAT (20%):     €10.00
Total:         €60.00
```

VAT is calculated automatically but can be overridden when creating invoices:
```typescript
const invoice = await createInvoice({
  tripId: BigInt(123),
  customerId: BigInt(456),
  amount: 100.00,
  vat: 19.00  // Custom VAT instead of automatic 20%
});
```

---

## Invoice Status Workflow

```
┌─────────┐
│  draft  │  Created but not sent
└────┬────┘
     │ issueInvoice()
     ↓
┌─────────┐
│ issued  │  Sent to customer
└────┬────┘
     │
     ├─ markInvoiceAsPaid()
     │  ↓
     │ ┌───────┐
     │ │  paid │  Payment received ✓
     │ └───────┘
     │
     └─ (14 days pass without payment)
        ↓
     ┌──────────┐
     │ overdue  │  Past due date
     └────┬─────┘
          │ markInvoiceAsPaid()
          ↓
        ┌───────┐
        │  paid │  Late payment
        └───────┘
```

---

## Audit Trail

All invoice actions are logged to `AuditLog`:

```
actorUserId: "manager-123"
action: "issue_invoice"
entityType: "Invoice"
entityId: "789"
newValue: { status: "issued", issuedAt: "2024-10-13T..." }

---

actorUserId: "manager-123"
action: "mark_invoice_paid"
entityType: "Invoice"
entityId: "789"
newValue: { status: "paid", paidAt: "2024-10-15T..." }
```

---

## Authorization

| Action | Roles |
|--------|-------|
| Create | admin, manager |
| View | admin, manager, driver |
| Issue | admin, manager |
| Update | admin, manager |
| Mark Paid | admin, manager |

---

## Error Handling

```typescript
try {
  const invoice = await createInvoice({
    tripId: BigInt(999),  // Non-existent
    customerId: BigInt(456)
  });
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Trip not found');
  } else if (error.message.includes('already exists')) {
    console.error('Invoice already created for this trip');
  } else if (error.message.includes('mismatch')) {
    console.error('Customer ID does not match trip');
  }
}
```

**Common Errors:**
- `"Trip [id] not found"` - Trip does not exist
- `"Invoice already exists for trip [id]"` - One invoice per trip only
- `"Customer ID mismatch with trip"` - Invoice customer ≠ Trip customer
- `"Cannot issue invoice with status: [status]"` - Already issued/paid
- `"Cannot modify amounts on issued or paid invoices"` - Only drafts editable

---

## Integration Example: Auto-Create Invoice After Trip Completion

```typescript
// In your trip completion endpoint
import { createInvoice } from '$lib/server/invoicing/invoice-service';

export const POST: RequestHandler = async ({ params, locals }) => {
  // 1. Complete the trip
  const trip = await prisma.trip.update({
    where: { id: BigInt(params.id) },
    data: { status: 'completed' }
  });

  // 2. Auto-create invoice
  try {
    const invoice = await createInvoice({
      tripId: trip.id,
      customerId: trip.customerId
      // Amount and VAT auto-calculated from trip.totalAmount
    });
    
    console.log(`Invoice created: ${invoice.invoiceNumber}`);
  } catch (error) {
    console.error('Failed to create invoice:', error);
    // Don't fail trip completion if invoice fails
  }

  return json({ trip });
};
```

---

## Scheduled Tasks (Cron Jobs)

### Daily Overdue Check

Run daily to mark issued invoices as overdue if due date passed:

```bash
# Railway scheduler or external cron
POST /api/invoices/stats?action=check-overdue
```

Or via code:
```typescript
// In a background job runner
import { checkAndUpdateOverdueInvoices } from '$lib/server/invoicing/invoice-service';

async function dailyTask() {
  const count = await checkAndUpdateOverdueInvoices();
  console.log(`Marked ${count} invoices as overdue`);
}
```

---

## Testing

```bash
# Create test invoice
curl -X POST http://localhost:5173/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "1",
    "customerId": "1",
    "amount": 50.00
  }'

# Issue invoice
curl -X POST http://localhost:5173/api/invoices/1?action=issue

# Mark as paid
curl -X POST http://localhost:5173/api/invoices/1?action=pay

# View stats
curl http://localhost:5173/api/invoices/stats
```

---

## Compliance Notes

✅ **Austrian Tax Requirements:**
- ✓ Unique invoice numbers per year
- ✓ Issue date tracking
- ✓ Payment due date (standard 14 days)
- ✓ VAT calculation (20%)
- ✓ Customer and service details
- ✓ Audit trail of all changes

For production use as Selbstständiger:
- Store invoices for 7 years (Austrian law)
- Include correct customer/business details
- Track payment dates
- Report VAT quarterly to Finanzamt

---

## Future Enhancements

- [ ] PDF invoice generation
- [ ] Email invoice delivery
- [ ] Payment reminders (automatic email at due date)
- [ ] Invoice numbering customization (by company)
- [ ] Recurring invoices for subscriptions
- [ ] Multi-currency support
- [ ] Invoice templates
- [ ] Payment gateway integration (automatic payment links)
- [ ] Credit notes / corrections
- [ ] Bulk invoice actions
