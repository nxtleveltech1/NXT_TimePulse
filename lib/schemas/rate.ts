import { z } from "zod"

export const rateCardStatusSchema = z.enum(["pending", "active", "superseded", "cancelled"])

export const createRateCardSchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1).optional().nullable(),
  payRate: z.coerce.number().min(0),
  billRate: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().optional().nullable(),
  changeReason: z.string().max(1000).optional().nullable(),
})
  .refine((v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    message: "effectiveTo must be on/after effectiveFrom",
    path: ["effectiveTo"],
  })

export const updateRateCardSchema = z.object({
  payRate: z.coerce.number().min(0).optional(),
  billRate: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()).optional(),
  effectiveFrom: z.string().date().optional(),
  effectiveTo: z.string().date().optional().nullable(),
  status: rateCardStatusSchema.optional(),
  changeReason: z.string().max(1000).optional().nullable(),
})
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  })

export const resolveRateQuerySchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
  date: z.string().date(),
})

export type CreateRateCardInput = z.infer<typeof createRateCardSchema>
export type UpdateRateCardInput = z.infer<typeof updateRateCardSchema>
