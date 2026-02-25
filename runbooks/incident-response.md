# Incident Response Runbook

## Admin Access Issues

**Symptom**: Admins cannot access Users, Reports, Financials, or Audit.

**Checks**:
1. Verify Clerk org role: user must have `org:admin` or `org:manager` in the organization
2. Check middleware logs for 403 on admin routes
3. Verify `orgId` is present in session (redirect to /request-access if missing)

**Resolution**: Update user role in Clerk Dashboard → Organization → Members

## Database

**Symptom**: Prisma/Neon connection errors.

**Checks**:
1. DATABASE_URL and DIRECT_URL in environment
2. Neon project status and branch
3. Connection pool limits

**Resolution**: Verify env vars, check Neon dashboard, consider connection pooling (PgBouncer)
