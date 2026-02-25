# NXT TIME PULSE Architecture

## Overview

GEO TIMESHEET - TIMEPULSE is a workforce timesheet and geozone management application built with Next.js App Router, Clerk, Neon Postgres, and Prisma.

## Admin Access Control

### Role Model

- **org:admin** (Clerk) / **admin** (DB): Full admin access
- **org:manager** (Clerk) / **manager** (DB): Same as admin for this increment
- **org:member** (Clerk) / **worker** (DB): Field workers, limited access

### Enforcement Layers

1. **Middleware** (`middleware.ts`): Blocks workers from admin dashboard routes (`/dashboard/users`, `/dashboard/reports`, `/dashboard/financials`, `/dashboard/audit`) with 403
2. **Page guards**: Server Components check `isAdminOrManager(orgRole)` before rendering admin content
3. **API guards**: All admin APIs call `isAdminOrManager(orgRole)` and return 403 for workers

### Admin-Only Features

| Feature | Route | API |
|---------|-------|-----|
| Users | /dashboard/users | GET/PATCH /api/users |
| Reports | /dashboard/reports | GET /api/reports/payroll |
| Financials | /dashboard/financials | /api/financials/* |
| Audit | /dashboard/audit | GET /api/audit |
| Create project | /dashboard/projects (button) | POST /api/projects |

## Data Flow

```
Clerk Session → orgRole → isAdminOrManager() → allow/deny
                    ↓
         Middleware (route-level)
                    ↓
         Page/API (handler-level)
```

## Key Files

- `lib/auth.ts`: `isAdminOrManager`, `requireAdminOrManager`
- `middleware.ts`: Admin route matcher
- `app/(dashboard)/layout.tsx`: Role-filtered nav
