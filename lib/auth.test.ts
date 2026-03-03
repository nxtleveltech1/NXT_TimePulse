import { describe, it, expect } from "vitest"
import { hasCapability, isAdmin, isAdminOrManager, mapClerkRoleToAppRole } from "./auth"

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

describe("isAdmin", () => {
  it("returns true for org:admin", () => {
    expect(isAdmin("org:admin")).toBe(true)
  })

  it("returns false for org:manager", () => {
    expect(isAdmin("org:manager")).toBe(false)
  })
})

describe("mapClerkRoleToAppRole", () => {
  it("maps org roles to app roles", () => {
    expect(mapClerkRoleToAppRole("org:admin")).toBe("admin")
    expect(mapClerkRoleToAppRole("org:manager")).toBe("manager")
    expect(mapClerkRoleToAppRole("org:member")).toBe("worker")
  })

  it("returns null for unknown role", () => {
    expect(mapClerkRoleToAppRole("org:guest")).toBeNull()
  })
})

describe("hasCapability", () => {
  it("allows compensation.write for org:admin only", () => {
    expect(hasCapability("org:admin", "compensation.write")).toBe(true)
    expect(hasCapability("org:manager", "compensation.write")).toBe(false)
    expect(hasCapability("org:member", "compensation.write")).toBe(false)
  })

  it("allows assignments.write for org:manager", () => {
    expect(hasCapability("org:manager", "assignments.write")).toBe(true)
  })
})
