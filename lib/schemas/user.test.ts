import { describe, it, expect } from "vitest"
import { userUpdateSchema } from "./user"

describe("userUpdateSchema", () => {
  it("accepts valid role and status", () => {
    const result = userUpdateSchema.safeParse({ role: "admin", status: "active" })
    expect(result.success).toBe(true)
  })

  it("accepts role only", () => {
    const result = userUpdateSchema.safeParse({ role: "worker" })
    expect(result.success).toBe(true)
  })

  it("accepts status only", () => {
    const result = userUpdateSchema.safeParse({ status: "inactive" })
    expect(result.success).toBe(true)
  })

  it("rejects empty object", () => {
    const result = userUpdateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects invalid role", () => {
    const result = userUpdateSchema.safeParse({ role: "superuser" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid status", () => {
    const result = userUpdateSchema.safeParse({ status: "suspended" })
    expect(result.success).toBe(false)
  })
})
