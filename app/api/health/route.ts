import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  let dbStatus: "ok" | "error" = "ok"
  let dbLatencyMs = 0

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
  } catch {
    dbStatus = "error"
  }

  const healthy = dbStatus === "ok"

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
      version: process.env.npm_package_version ?? "unknown",
    },
    { status: healthy ? 200 : 503 }
  )
}
