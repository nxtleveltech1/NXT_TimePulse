import { z } from "zod"

export const manualEntrySchema = z
  .object({
    projectId: z.string().min(1, "Project is required"),
    date: z.string().min(1, "Date is required"),
    clockIn: z.string().min(1, "Clock in time is required"),
    clockOut: z.string().optional(),
    notes: z.string().optional(),
    breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
    isBillable: z.boolean().default(true),
  })
  .refine(
    (d) => {
      if (!d.clockOut) return true
      const ci = new Date(`${d.date}T${d.clockIn}`)
      const co = new Date(`${d.date}T${d.clockOut}`)
      return co > ci
    },
    { message: "Clock out must be after clock in", path: ["clockOut"] }
  )

export type ManualEntryValues = z.infer<typeof manualEntrySchema>

export const editEntrySchema = z
  .object({
    clockIn: z.string().min(1, "Clock in time is required"),
    clockOut: z.string().optional(),
    notes: z.string().optional(),
    breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
    isBillable: z.boolean().default(true),
    adjustmentReason: z.string().optional(),
  })
  .refine(
    (d) => {
      if (!d.clockOut) return true
      const ci = new Date(d.clockIn)
      const co = new Date(d.clockOut)
      return co > ci
    },
    { message: "Clock out must be after clock in", path: ["clockOut"] }
  )

export type EditEntryValues = z.infer<typeof editEntrySchema>

export const batchEntrySchema = z.object({
  entries: z.array(
    z.object({
      projectId: z.string().min(1),
      date: z.string().min(1),
      clockIn: z.string().min(1),
      clockOut: z.string().min(1),
      notes: z.string().optional(),
      breakMinutes: z.coerce.number().int().min(0).default(0),
      isBillable: z.boolean().default(true),
    })
  ).min(1, "At least one entry required"),
})

export type BatchEntryValues = z.infer<typeof batchEntrySchema>
