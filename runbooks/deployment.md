# Deployment Runbook

## Prerequisites

- Bun installed
- Neon database connection string
- Clerk environment variables

## Deploy Steps

1. Set environment variables (DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_CLERK_*, CLERK_SECRET_KEY, etc.)
2. Run migrations: `bunx prisma migrate deploy`
3. Build: `bun run build`
4. Start: `bun run start` (or deploy to Vercel)

## Rollback

1. Revert to previous deployment
2. If schema changed: `bunx prisma migrate resolve --rolled-back <migration_name>`
3. Restart application
