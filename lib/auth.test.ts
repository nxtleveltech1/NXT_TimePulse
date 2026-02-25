import { describe, it, expect } from "vitest"
import { isAdminOrManager } from "./auth"

describe("isAdminOrManager", () => {
  it("returns true for org:admin", () => {
    expect(isAdminOrManager("org:admin")).toBe(true)
  })

  it("returns true for org:manager", () => {
    expect(isAdminOrManager("org:manager")).toBe(true)
  })

  it("returns false for org:member", () => {
    expect(isAdminOrManager("org:member")).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isAdminOrManager(undefined)).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isAdminOrManager("")).toBe(false)
  })

  it("returns false for unknown role", () => {
    expect(isAdminOrManager("org:guest")).toBe(false)
  })
})
