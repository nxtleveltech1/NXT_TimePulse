import { z } from "zod"

export const assignmentStatusSchema = z.enum(["active", "paused", "ended"])

export const createAssignmentSchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
  roleOnProject: z.string().min(1).max(120),
  allocationPct: z.coerce.number().min(0).max(100).default(100),
  startDate: z.string().date(),
  endDate: z.string().date().optional().nullable(),
})
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "endDate must be on/after startDate",
    path: ["endDate"],
  })

export const updateAssignmentSchema = z.object({
  roleOnProject: z.string().min(1).max(120).optional(),
  allocationPct: z.coerce.number().min(0).max(100).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional().nullable(),
  status: assignmentStatusSchema.optional(),
})
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  })

export const endAssignmentSchema = z.object({
  endDate: z.string().date(),
  reason: z.string().min(3).max(500).optional(),
})

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>
export type EndAssignmentInput = z.infer<typeof endAssignmentSchema>
