# TimePulse — Geo Timesheet

Workforce timesheet and resource management with automatic geofence clock-in/out. Built with Next.js, Clerk, Neon (PostgreSQL + PostGIS), and Prisma.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind, shadcn/ui
- **Auth**: Clerk (Organizations, RBAC: admin/manager/worker)
- **Database**: Neon PostgreSQL + PostGIS
- **ORM**: Prisma

## Setup

### 1. Clone and install

```bash
bun install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

```env
# Clerk (required for auth and build)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Neon (already configured for GEO TIMESHEET project)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Mapbox (optional, for geozone map drawing)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

### 3. Clerk

1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Enable **Organizations** → Settings → Configure roles: `admin`, `manager`, `worker`
3. Copy publishable and secret keys to `.env`
4. Add webhook: `https://your-domain/api/webhooks/clerk`, events: `user.created`, `organizationMembership.created`
5. Copy webhook signing secret to `CLERK_WEBHOOK_SIGNING_SECRET`

### 4. Database

Migrations are already applied via Neon MCP. To sync Prisma:

```bash
bunx prisma generate
```

### 5. Run

```bash
bun run dev
```

## API

- `POST /api/geoevent` — Geofence entry/exit (mobile sends lat, lon, geozoneId, eventType)
- `GET/POST /api/projects` — Projects CRUD
- `GET/POST /api/projects/[id]/geozones` — Geozones CRUD
- `GET/PATCH/DELETE /api/geozones/[id]` — Single geozone
- `GET/POST /api/timesheets` — Timesheets
- `GET/PATCH /api/timesheets/[id]` — Single timesheet (approve/reject)
- `GET /api/users` — Users
- `GET/POST /api/allocations` — Project allocations

See `openapi.yaml` for full spec.

## Mobile integration

Expo app posts to `POST /api/geoevent` with Clerk Bearer token:

```ts
// expo-location + startGeofencingAsync
Location.startGeofencingAsync(TASK_NAME, geofences);

// Background task
fetch('https://yourapp.com/api/geoevent', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${await getToken()}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lat, lon, geozoneId, eventType: 'entry' | 'exit', deviceInfo
  }),
});
```

## Runbook

### Deploy (Vercel)

1. Connect repo
2. Add env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL`
3. Deploy

### Neon

- Project: GEO TIMESHEET - TIMEPULSE (`calm-haze-45525372`)
- Branch: main
- PostGIS enabled

### Rate limits

- `/api/geoevent`: 60 requests/minute per user

## Scripts

- `bun run dev` — Development
- `bun run build` — Production build
- `bun run lint` — ESLint
- `bunx prisma studio` — DB GUI
