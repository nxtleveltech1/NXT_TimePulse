import { z } from "zod"

export const userUpdateSchema = z.object({
  role: z.enum(["admin", "manager", "worker"]).optional(),
  status: z.enum(["invited", "active", "suspended", "offboarded", "archived"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one of role or status must be provided",
})

export const userRateUpdateSchema = z.object({
  baseRate: z.number().min(0),
  currency: z.enum(["ZAR", "USD", "EUR", "GBP", "AUD", "CAD"]).default("ZAR"),
})

export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserRateUpdateInput = z.infer<typeof userRateUpdateSchema>
