import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const KIOSK_SECRET = process.env.KIOSK_SECRET

// Simple rate limiting: track failed attempts in memory (per edge instance)
// For production, use Redis / Upstash
const failedAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 10
const WINDOW_MS = 60000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = failedAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    return true
  }
  return entry.count < MAX_ATTEMPTS
}

function recordFailure(ip: string) {
  const now = Date.now()
  const entry = failedAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count++
  }
}

export async function POST(req: Request) {
  // Verify kiosk secret when configured
  const secret = req.headers.get("x-kiosk-secret")
  if (KIOSK_SECRET && secret !== KIOSK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts. Wait a moment." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const employeeCode = typeof b.employeeCode === "string" ? b.employeeCode.trim() : ""
  const orgId = typeof b.orgId === "string" ? b.orgId.trim() : ""

  if (!employeeCode || !orgId) {
    return NextResponse.json({ error: "employeeCode and orgId required" }, { status: 400 })
  }

  const worker = await prisma.user.findFirst({
    where: {
      employeeCode,
      orgId,
      status: "active",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      allocations: {
        where: { isActive: true },
        include: { project: { select: { id: true, name: true } } },
      },
    },
  })

  if (!worker) {
    recordFailure(ip)
    return NextResponse.json({ error: "Employee code not found" }, { status: 404 })
  }

  // Check for open timesheet
  const openTimesheet = await prisma.timesheet.findFirst({
    where: { userId: worker.id, clockOut: null },
    include: { project: { select: { name: true } } },
    orderBy: { clockIn: "desc" },
  })

  return NextResponse.json({
    userId: worker.id,
    name: `${worker.firstName ?? ""} ${worker.lastName ?? ""}`.trim(),
    employeeCode: worker.employeeCode,
    allocations: worker.allocations,
    openTimesheet: openTimesheet
      ? {
          id: openTimesheet.id,
          projectName: openTimesheet.project.name,
          clockIn: openTimesheet.clockIn.toISOString(),
        }
      : null,
  })
}
