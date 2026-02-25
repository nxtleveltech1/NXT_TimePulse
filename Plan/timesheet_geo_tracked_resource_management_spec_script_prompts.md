# Timesheet & Geo-Tracked Resource Management — Neon + Clerk + Next.js Stack

**Architecture Stack**  
- **Frontend (Web Admin + PWA):** Next.js (App Router) + React + TypeScript + Tailwind  
- **Mobile:** React Native (Expo)  
- **Auth:** Clerk (RBAC via roles + orgs)  
- **Database:** Neon (PostgreSQL) + PostGIS  
- **ORM:** Prisma  
- **API Layer:** Next.js Route Handlers (Edge where suitable)  
- **Maps & Geolocation:** Mapbox or Google Maps SDK  
- **Hosting:** Vercel (Web) + Expo EAS (Mobile)

---

# 1. Product Overview
A mobile-first workforce timesheet and resource management system that automatically logs work time when a user enters a defined geofence. Built with modern serverless architecture using Neon + Clerk + Next.js.

Core principles:
- Server-verified geolocation events
- Role-based access control via Clerk
- Multi-project allocation
- Full audit logging
- Privacy-first tracking

---

# 2. System Architecture

## 2.1 High-Level Flow

1. Mobile device detects geofence entry (native API).
2. App sends secure request to `/api/geoevent` with Clerk JWT.
3. Server verifies token using Clerk middleware.
4. API validates location against Neon/PostGIS geozone.
5. If valid → create or close timesheet entry.
6. Log audit + geolog event.

---

# 3. Database Schema (Neon + PostGIS + Prisma Compatible)

## Enable PostGIS
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Core Tables
```sql
CREATE TABLE users (
  id text PRIMARY KEY, -- Clerk user ID
  email text,
  role text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE geozones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  name text,
  geom geometry(Polygon, 4326),
  radius_m integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX geozone_geom_idx ON geozones USING GIST (geom);

CREATE TABLE timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(id),
  project_id uuid REFERENCES projects(id),
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds integer,
  source text DEFAULT 'geofence',
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE geologs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  geozone_id uuid,
  event_type text,
  coords geometry(Point, 4326),
  device_info jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

# 4. Next.js API Example — Geofence Verification

`app/api/geoevent/route.ts`

```ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lat, lon, geozoneId, eventType } = await req.json();

  const geozone = await prisma.$queryRawUnsafe(`
    SELECT id, project_id
    FROM geozones
    WHERE id = '${geozoneId}'
      AND ST_Contains(
        geom,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      )
  `);

  if (!geozone.length) {
    return NextResponse.json({ error: "Outside geozone" }, { status: 400 });
  }

  if (eventType === "entry") {
    await prisma.timesheets.create({
      data: {
        user_id: userId,
        project_id: geozone[0].project_id,
        start_time: new Date(),
      }
    });
  }

  if (eventType === "exit") {
    const openEntry = await prisma.timesheets.findFirst({
      where: {
        user_id: userId,
        end_time: null
      }
    });

    if (openEntry) {
      await prisma.timesheets.update({
        where: { id: openEntry.id },
        data: {
          end_time: new Date(),
          duration_seconds: Math.floor(
            (Date.now() - new Date(openEntry.start_time).getTime()) / 1000
          )
        }
      });
    }
  }

  return NextResponse.json({ success: true });
}
```

---

# 5. Clerk RBAC Model

Use Clerk Organizations:

- Org Role: `admin`
- Org Role: `manager`
- Org Role: `worker`

Protect routes:

```ts
import { auth } from "@clerk/nextjs/server";

const { orgRole } = auth();
if (orgRole !== "admin") return unauthorized();
```

---

# 6. Mobile (Expo) Geofence Logic

Use:
- `expo-location`
- `startGeofencingAsync`

Flow:

```ts
Location.startGeofencingAsync(TASK_NAME, geofences);
```

Background task posts to:

```
POST https://yourapp.com/api/geoevent
Authorization: Bearer <Clerk Token>
```

---

# 7. Core Feature Modules

## Worker App
- View assigned projects
- Auto clock-in/out
- Manual adjustment with reason
- Timesheet history

## Admin Dashboard (Next.js)
- Draw geozones (Mapbox polygon tool)
- Manage users (via Clerk API)
- Approve timesheets
- Export CSV
- Project allocation management

## Reporting
- Hours by project
- Hours by worker
- Billable vs non-billable
- Export to payroll

---

# 8. Security & Compliance

- Server-side location validation (never trust client)
- Rate limiting on geoevent endpoint
- Store raw coordinates short-term (e.g., 90 days)
- Encrypt secrets via Vercel env
- Audit table for all timesheet edits

---

# 9. AI Build Prompts (Stack-Specific)

## Full Scaffold Generator
```
Create a full-stack Next.js 14 App Router project using Clerk for authentication, Neon Postgres with Prisma ORM, Tailwind for UI, and PostGIS for geospatial support. Include:
- Project CRUD
- Geozone polygon storage
- Geoevent webhook
- Timesheet auto-start/stop logic
- Role-based access (admin/manager/worker)
Return folder structure + minimal runnable code.
```

## Prisma Schema Generator
```
Generate a Prisma schema compatible with Neon Postgres and PostGIS for users, projects, geozones, timesheets, and geologs. Include spatial indexing.
```

---

# 10. MVP Sprint Breakdown (Neon + Clerk Stack)

**Sprint 1:** Clerk auth + Neon DB connection + Prisma setup  
**Sprint 2:** Project & geozone management UI  
**Sprint 3:** Mobile geofence event integration  
**Sprint 4:** Timesheet auto-creation & approval workflow  
**Sprint 5:** Reporting dashboard + CSV export  
**Sprint 6:** Hardening, rate limiting, audit, performance optimization

---

This version aligns fully with your Neon + Clerk + Next.js + React architecture and is structured for immediate build execution.

