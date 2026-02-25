# ADR 001: Admin RBAC via Clerk Org Roles

## Status

Accepted

## Context

Admin features (users, reports, financials, audit) require role-based access control. The application uses Clerk for authentication and organization membership.

## Decision

- Use Clerk `orgRole` (`org:admin`, `org:manager`, `org:member`) as the source of truth
- Treat `org:admin` and `org:manager` identically for admin access
- Enforce at three layers: middleware (route), page (RSC), API (handler)
- No separate RBAC database table; User.role in DB is for display/legacy, not auth

## Consequences

- Single source of truth (Clerk)
- No sync issues between Clerk and DB for auth
- Workers cannot access admin routes even with direct URL navigation
