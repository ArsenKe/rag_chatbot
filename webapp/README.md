# Royal E-Cars Fullstack WebApp (SvelteKit + PostgreSQL)

This folder contains the fullstack app scaffold requested:

- Frontend: SvelteKit + TypeScript + Tailwind
- App API: SvelteKit server routes for operations
- AI API: existing FastAPI service (`/ask`, `/data/*`, `/whatsapp/webhook`)
- Database: PostgreSQL with operational + star schema in the same DB
- Auth/Roles:
  - Option A: Supabase Auth (env + client helper included)
  - Option B: Custom JWT auth in SvelteKit (implemented)

## Folder Map

- `src/routes/(app)/dashboard`
- `src/routes/(app)/drivers`
- `src/routes/(app)/cars`
- `src/routes/(app)/bookings`
- `src/routes/(app)/calendar`
- `src/routes/(app)/reports`
- `src/routes/api/drivers`
- `src/routes/api/cars`
- `src/routes/api/bookings`
- `src/routes/api/assignments`
- `src/routes/api/reports`
- `src/routes/api/ai/ask`
- `src/lib/server/db`
- `src/lib/server/auth`
- `src/lib/server/rbac`
- `src/lib/components/calendar`
- `src/lib/components/tables`
- `prisma/schema.prisma`
- `db/schema.sql`
- `db/etl.sql`

## Setup

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.example .env
```

3. Configure PostgreSQL URL and FastAPI base URL in `.env`

4. Apply Prisma schema and generate client

```bash
npm run db:generate
npm run db:push
```

5. Run app

```bash
npm run dev
```

## Railway Deployment (Recommended)

Deploy as two Railway services plus one PostgreSQL add-on:

1. Service 1: `sveltekit-app` (this `webapp` folder)
2. Service 2: `fastapi-rag` (your existing FastAPI app in `rag_chatbot` root)
3. Add-on: PostgreSQL

### Service: sveltekit-app

- Root directory: `webapp`
- Build command: `npm install ; npm run build`
- Start command: `npm run start`
- Required env:
  - `DATABASE_URL` (Railway PostgreSQL connection)
  - `DIRECT_URL` (same DB connection)
  - `AUTH_PROVIDER` (`jwt` or `supabase`)
  - `JWT_SECRET` (required for jwt mode)
  - `SVELTEKIT_API_BASE_URL` (public URL of `fastapi-rag`)

### Service: fastapi-rag

- Root directory: `rag_chatbot`
- Use existing Dockerfile/app deployment
- Required env:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `EMBEDDING_MODEL`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_NUMBER`
  - `CORS_ALLOWED_ORIGINS` (set this to the exact `sveltekit-app` domain)

### Strict CORS between services

FastAPI now reads `CORS_ALLOWED_ORIGINS` (comma-separated) and only allows those origins.
Example:

- `CORS_ALLOWED_ORIGINS=https://your-sveltekit-app.up.railway.app`

## Auth Modes

- `AUTH_PROVIDER=jwt`
  - Uses `/api/auth/login` demo endpoint and JWT cookie.
- `AUTH_PROVIDER=supabase`
  - Use Supabase URL/key and replace login flow with Supabase session validation.

## Assignment Conflict Rule

Assignment endpoint enforces overlap rejection with this condition:

`existing_start < new_end AND existing_end > new_start`

## Analytics Layer

- Operational writes go to: driver, car, customer, booking, trip, driver_availability, maintenance_log, payment
- Reporting reads from star schema: dim_* and fact_trip
- Run `db/etl.sql` to refresh dimensions and fact snapshot from operational tables

## FastAPI Integration

Dashboard uses `/api/ai/ask` which proxies to `${SVELTEKIT_API_BASE_URL}/ask`.
Keep your existing FastAPI service running as the AI API.

## Suggested Delivery Phases

### Phase 1

- PostgreSQL
- auth
- CRUD for drivers/cars/customers

Status in this scaffold:
- PostgreSQL schema and Prisma models: done
- JWT auth and RBAC skeleton: done
- Drivers/Cars CRUD endpoints: partial (list/create)
- Customer CRUD: not yet added

### Phase 2

- Booking flow
- conflict detection
- manual assignment

Status in this scaffold:
- Booking create/list: done
- Conflict detection with overlap rule: done
- Manual assignment + override + audit log: done

### Phase 3

- Calendar view
- drag/drop assignment

Status in this scaffold:
- Calendar placeholder: done
- Drag/drop interaction: pending (replace placeholder with FullCalendar)

### Phase 4

- Star schema ETL
- analytics dashboard

Status in this scaffold:
- Star schema tables: done
- ETL SQL: done (`db/etl.sql`)
- Report API and basic reports page: done

### Phase 5

- Connect chatbot panel to FastAPI ask endpoint
- role-aware access

Status in this scaffold:
- Role-gated `/api/ai/ask` proxy: done
- Dashboard chatbot panel wired to proxy: done
