# Royal E-Cars MVP - Phase 2 Roadmap

**Projekt:** Royal E-Cars Fullstack WebApp (SvelteKit + PostgreSQL)  
**Status:** 90% Live - Backend Complete, Frontend Phase 2 pending  
**Deployment:** Railway (Production)  
**Stand:** November 2026

---

## 📊 Übersicht

Das Projekt ist zu **90% produktionsbereit**. Alle kritischen Backend-APIs sind live und funktional:

| Komponente | Status |
|---|---|
| **Backend APIs** | ✅ COMPLETE |
| **Database** | ✅ COMPLETE |
| **Authentication** | ✅ COMPLETE |
| **Payout Calculation** | ✅ COMPLETE |
| **Notifications (API)** | ✅ COMPLETE |
| **Frontend Components** | 🟡 30% (Skeleton only) |
| **Frontend Pages** | 🟡 20% (Dashboard only) |
| **Testing Suite** | 🟡 10% |

---

## 📋 Phase 2 Aufgaben

### **PRIORITÄT 1: KRITISCHE USER-FACING FEATURES**

#### 1️⃣ Notification Bell Component
- **Aufwand:** 2-3h
- **Kategorie:** Frontend UI
- **Beschreibung:** Bell-Icon mit Badge (unread count), Dropdown-Modal mit Benachrichtigungen
- **Dateien zu erstellen:**
  - `src/lib/components/NotificationBell.svelte`
  - `src/lib/components/NotificationDropdown.svelte`
- **API-Integration:** `GET /api/notifications`
- **Features:**
  - Unread count Badge
  - Pagination/Infinite scroll
  - Mark as read (single & bulk)
  - Real-time updates (WebSocket optional)
- **Business Value:** 🔴 CRITICAL - Benutzer können keine Nachrichten empfangen ohne UI

#### 2️⃣ Driver Earnings Dashboard
- **Aufwand:** 4-5h
- **Kategorie:** Frontend UI
- **Beschreibung:** Real-time Verdienst-Tracking für Fahrer
- **Dateien zu erstellen:**
  - `src/routes/(app)/earnings/+page.svelte`
  - `src/routes/(app)/earnings/+page.server.ts`
  - `src/lib/components/EarningsChart.svelte`
  - `src/lib/components/TripEarningsTable.svelte`
- **API-Integration:**
  - `GET /api/payouts/driver/:driverId` (neu)
  - `GET /api/payouts/driver/:driverId/breakdown` (neu)
- **Features:**
  - Total earnings this month/week/all-time
  - Earnings breakdown by trip
  - Commission calculation transparency
  - Withdrawal request button
  - Charts (line/bar for trends)
- **Business Value:** 🔴 CRITICAL - Driver engagement & retention

#### 3️⃣ Event Integration Hooks
- **Aufwand:** 3-4h
- **Kategorie:** Backend Integration
- **Beschreibung:** Automatische Notification Triggers bei Trip-Lifecycle Events
- **Dateien zu modifizieren:**
  - `src/lib/server/trips/trip-event-handler.ts` (neu)
  - `src/routes/api/trips/[id]/start/+server.ts` (neu)
  - `src/routes/api/trips/[id]/complete/+server.ts` (neu)
- **Events zu integrieren:**
  - `trip_started` → notify customer
  - `trip_completed` → calculate payout → notify driver
  - `payment_received` → notify driver
  - `tour_started` → notify guests
  - `tour_completed` → notify customers
- **Features:**
  - Event-driven architecture
  - Non-blocking notifications
  - Error handling & retry logic
- **Business Value:** 🔴 CRITICAL - Core MVP functionality

#### 4️⃣ Admin Revenue Dashboard
- **Aufwand:** 3-4h
- **Kategorie:** Frontend UI
- **Beschreibung:** Platform-wide revenue stats für Admins/Managers
- **Dateien zu erstellen:**
  - `src/routes/(app)/admin/revenue/+page.svelte`
  - `src/routes/(app)/admin/revenue/+page.server.ts`
  - `src/lib/components/RevenueChart.svelte`
  - `src/lib/components/RevenueMetrics.svelte`
- **API-Integration:** `GET /api/payouts/stats` (already exists)
- **Features:**
  - Total platform revenue
  - Commission earned (20%)
  - Payouts to drivers (80%)
  - Date range filtering
  - Export to CSV
  - Top earners list
- **Business Value:** 🟡 HIGH - Business intelligence

---

### **PRIORITÄT 2: OPERATOR DASHBOARDS**

#### 5️⃣ Customer Booking History
- **Aufwand:** 2-3h
- **Kategorie:** Frontend UI
- **Dateien zu erstellen:**
  - `src/routes/(app)/bookings/+page.svelte`
  - `src/routes/(app)/bookings/+page.server.ts`
  - `src/lib/components/BookingCard.svelte`
  - `src/lib/components/BookingFilters.svelte`
- **API-Integration:** `GET /api/bookings` (exists, may need filtering enhancement)
- **Features:**
  - Booking history list with filters
  - Status badges (reserved, assigned, completed, cancelled)
  - Estimated cost breakdown
  - Rebook button
  - Driver rating & reviews
- **Business Value:** 🟡 MEDIUM - Customer retention

#### 6️⃣ Manager Dispatch Dashboard
- **Aufwand:** 5-6h
- **Kategorie:** Frontend UI
- **Beschreibung:** Real-time Trip Management für Manager/Dispatcher
- **Dateien zu erstellen:**
  - `src/routes/(app)/dispatch/+page.svelte`
  - `src/routes/(app)/dispatch/+page.server.ts`
  - `src/lib/components/TripMap.svelte`
  - `src/lib/components/UnassignedTripsQueue.svelte`
  - `src/lib/components/DriverStatus.svelte`
- **API-Integration:**
  - `GET /api/trips/unassigned` (neu)
  - `POST /api/trips/:id/assign` (neu)
  - `GET /api/drivers/active` (neu)
- **Features:**
  - Map view of active trips
  - Unassigned trip queue
  - Driver availability status
  - Manual assignment UI
  - Real-time updates
- **Business Value:** 🟡 MEDIUM - Operational efficiency

#### 7️⃣ Admin User Management
- **Aufwand:** 4-5h
- **Kategorie:** Frontend UI
- **Dateien zu erstellen:**
  - `src/routes/(app)/admin/users/+page.svelte`
  - `src/routes/(app)/admin/users/[id]/+page.svelte`
  - `src/lib/components/UserTable.svelte`
  - `src/lib/components/UserForm.svelte`
- **API-Integration:**
  - `GET /api/admin/users` (neu)
  - `PATCH /api/admin/users/:id` (neu)
  - `DELETE /api/admin/users/:id` (neu)
- **Features:**
  - User listing with pagination
  - Role assignment (admin, manager, driver, customer)
  - Status management (active, suspended)
  - Edit user details
  - Delete users
- **Business Value:** 🟡 MEDIUM - Platform governance

---

### **PRIORITÄT 3: GESCHÄFTSFEATURES**

#### 8️⃣ Payment/Withdrawal System
- **Aufwand:** 6-7h
- **Kategorie:** Backend + Frontend
- **Beschreibung:** Driver-initiated withdrawal requests with payment processing
- **Dateien zu erstellen:**
  - `src/lib/server/payments/withdrawal-service.ts` (neu)
  - `src/routes/api/withdrawals/+server.ts` (neu)
  - `src/routes/(app)/wallet/+page.svelte` (neu)
  - Prisma Migration (add `Withdrawal` model)
- **Database Changes:**
  - Add `Withdrawal` model with fields: id, driverId, amount, status, requestedAt, completedAt
  - Add `WithdrawalStatus` enum: pending, approved, rejected, completed
- **Features:**
  - Request withdrawal
  - Admin approval workflow
  - Payment gateway integration (Stripe/PayPal)
  - Withdrawal history
  - Minimum withdrawal threshold
- **Business Value:** 🔴 CRITICAL - Driver retention

#### 9️⃣ Review & Rating System
- **Aufwand:** 3-4h
- **Kategorie:** Backend + Frontend
- **Beschreibung:** Customer reviews für Fahrer & Fahrer reviews für Kunden
- **Dateien zu erstellen:**
  - `src/lib/server/reviews/review-service.ts` (neu)
  - `src/routes/api/reviews/+server.ts` (neu)
  - `src/lib/components/RatingStars.svelte` (neu)
  - `src/lib/components/ReviewList.svelte` (neu)
  - Prisma Migration (add `Review` model)
- **Database Changes:**
  - Add `Review` model with fields: id, tripId, reviewerId, revieweeId, rating (1-5), comment, createdAt
- **Features:**
  - Rate driver/customer after trip
  - Average rating display
  - Review text & photos
  - Notification on new review
- **Business Value:** 🟡 HIGH - Quality control & trust

---

### **PRIORITÄT 4: QUALITÄT & MONITORING**

#### 🔟 API Integration Tests
- **Aufwand:** 4-5h
- **Kategorie:** Testing
- **Beschreibung:** Vitest + supertest for API endpoint testing
- **Dateien zu erstellen:**
  - `tests/api/bookings.test.ts`
  - `tests/api/payouts.test.ts`
  - `tests/api/notifications.test.ts`
  - `tests/setup.ts` (test database)
  - `vitest.config.ts`
- **Setup:**
  - Test database (separate from production)
  - Fixtures für seed data
  - Mock authentication
- **Coverage Goals:** 80%+ on critical paths
- **Business Value:** 🟡 MEDIUM - Regression prevention

#### 1️⃣1️⃣ E2E Tests
- **Aufwand:** 5-6h
- **Kategorie:** Testing
- **Beschreibung:** Playwright for user journey testing
- **Dateien zu erstellen:**
  - `tests/e2e/booking-flow.spec.ts`
  - `tests/e2e/driver-earnings.spec.ts`
  - `tests/e2e/notification-flow.spec.ts`
  - `playwright.config.ts`
- **Scenarios:**
  - Complete booking journey
  - Driver accepts & completes trip
  - Payment notification & withdrawal
  - Notification bell integration
- **Business Value:** 🟡 MEDIUM - Quality assurance

#### 1️⃣2️⃣ Monitoring & Analytics Dashboard
- **Aufwand:** 3-4h
- **Kategorie:** Operations
- **Beschreibung:** Health checks, performance metrics, error tracking
- **Dateien zu erstellen:**
  - `src/routes/(app)/admin/monitoring/+page.svelte`
  - `src/lib/server/monitoring/metrics-service.ts`
  - Integration with Railway metrics API
- **Metrics:**
  - API response times
  - Database query performance
  - Error rates
  - Active users
  - Trip completion rate
- **Tools:** Railway metrics, Sentry for error tracking
- **Business Value:** 🟡 MEDIUM - Operations visibility

---

## 🗓️ Empfohlener Zeitplan

### **WOCHE 1: Foundation**
```
Day 1-2:  Notification Bell Component (Task #1)
Day 3-4:  Event Integration Hooks (Task #3)
Day 5:    Review & Testing
```
**Deliverable:** Real-time notifications working end-to-end

### **WOCHE 2: Driver Features**
```
Day 1-3:  Driver Earnings Dashboard (Task #2)
Day 4-5:  Payment/Withdrawal System prep (Task #8)
```
**Deliverable:** Drivers can see earnings

### **WOCHE 3: Admin & Manager**
```
Day 1-2:  Admin Revenue Dashboard (Task #4)
Day 3-4:  Manager Dispatch Dashboard (Task #6)
Day 5:    Review & Testing
```
**Deliverable:** Operational dashboards live

### **WOCHE 4: Quality & Polish**
```
Day 1:    Payment/Withdrawal (Task #8 completion)
Day 2:    Review System (Task #9)
Day 3:    API Tests (Task #10)
Day 4:    E2E Tests (Task #11)
Day 5:    Monitoring (Task #12)
```
**Deliverable:** Production-ready quality

---

## 📁 Repository Structure (Post-Phase 2)

```
webapp/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── NotificationBell.svelte          ← Task #1
│   │   │   ├── EarningsChart.svelte             ← Task #2
│   │   │   ├── RatingStars.svelte               ← Task #9
│   │   │   └── ...
│   │   ├── server/
│   │   │   ├── trips/
│   │   │   │   └── trip-event-handler.ts        ← Task #3
│   │   │   ├── payments/
│   │   │   │   └── withdrawal-service.ts        ← Task #8
│   │   │   ├── reviews/
│   │   │   │   └── review-service.ts            ← Task #9
│   │   │   └── monitoring/
│   │   │       └── metrics-service.ts           ← Task #12
│   ├── routes/
│   │   ├── (app)/
│   │   │   ├── earnings/                        ← Task #2
│   │   │   ├── dispatch/                        ← Task #6
│   │   │   ├── admin/revenue/                   ← Task #4
│   │   │   ├── admin/users/                     ← Task #7
│   │   │   ├── admin/monitoring/                ← Task #12
│   │   │   ├── wallet/                          ← Task #8
│   │   │   └── bookings/                        ← Task #5
│   │   └── api/
│   │       ├── trips/
│   │       │   ├── [id]/start/                  ← Task #3
│   │       │   └── [id]/complete/               ← Task #3
│   │       ├── withdrawals/                     ← Task #8
│   │       ├── reviews/                         ← Task #9
│   │       └── admin/
│   │           └── users/                       ← Task #7
├── tests/
│   ├── api/
│   │   ├── bookings.test.ts                     ← Task #10
│   │   ├── payouts.test.ts                      ← Task #10
│   │   └── notifications.test.ts                ← Task #10
│   ├── e2e/
│   │   ├── booking-flow.spec.ts                 ← Task #11
│   │   └── driver-earnings.spec.ts              ← Task #11
│   └── setup.ts
└── prisma/
    └── migrations/
        ├── ...
        ├── add_withdrawal_model/                ← Task #8
        ├── add_review_model/                    ← Task #9
        └── ...
```

---

## 🚀 Getting Started

### Prerequisites
```bash
node >= 20.0.0
npm >= 10.0.0
PostgreSQL >= 15 (via Supabase)
```

### Setup Development
```bash
cd webapp
npm install
cp .env.example .env.local
npm run dev
```

### Deploy to Production
```bash
git add .
git commit -m "feat: Phase 2 feature X"
git push origin main
# Railway auto-deploys via webhook
```

---

## 🔗 Dependencies & Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | SvelteKit | 2.11.0 |
| **UI Framework** | Tailwind CSS | 4.0+ |
| **Backend ORM** | Prisma | 5.20.0 |
| **Database** | PostgreSQL (Supabase) | 15+ |
| **Authentication** | JWT + Supabase Auth | - |
| **Testing** | Vitest + Playwright | Latest |
| **Deployment** | Railway | Node 20+ |

---

## ✅ Definition of Done (DoD)

Each task is complete when:

1. ✅ Code implemented and follows project conventions
2. ✅ Database migrations applied (if needed)
3. ✅ API endpoints tested (POST/GET/PATCH/DELETE)
4. ✅ Frontend components styled with Tailwind
5. ✅ TypeScript strict mode passes (no `any` types)
6. ✅ Error handling implemented
7. ✅ Unit/integration tests written
8. ✅ Documentation updated (README/inline comments)
9. ✅ Committed and pushed to GitHub
10. ✅ Deployed to Railway staging
11. ✅ Verified in production

---

## 📞 Support & Questions

- **Repository:** [ArsenKe/rag_chatbot](https://github.com/ArsenKe/rag_chatbot)
- **Deployment:** [Railway](https://railway.app/project/84fa6adb-2056-4d97-bea0-eea23cbda911)
- **Database:** Supabase PostgreSQL
- **Documentation:** See [webapp/README.md](./webapp/README.md)

---

**Last Updated:** November 6, 2026  
**Owner:** Arsen Ke  
**Status:** In Development 🚀
