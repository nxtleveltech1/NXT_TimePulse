import { z } from "zod"

export const reviewChangeRequestSchema = z.object({
  comment: z.string().max(1000).optional().nullable(),
})

export const rejectChangeRequestSchema = z.object({
  reason: z.string().min(3).max(1000),
})
