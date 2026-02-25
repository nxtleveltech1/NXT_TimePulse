import { z } from "zod"

export const userUpdateSchema = z.object({
  role: z.enum(["admin", "manager", "worker"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one of role or status must be provided",
})

export type UserUpdateInput = z.infer<typeof userUpdateSchema>
