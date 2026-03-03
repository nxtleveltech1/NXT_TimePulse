/**
 * Deprecated: In-memory rate limiting is ineffective on serverless (Vercel).
 * All rate limiting now uses distributed-rate-limit.ts backed by Neon.
 * This module re-exports the distributed implementation for backwards compatibility.
 */
export { checkDistributedRateLimit as checkRateLimit } from "./distributed-rate-limit"
