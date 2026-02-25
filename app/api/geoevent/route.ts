import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

const geoeventSchema = {
  lat: (v: unknown) => typeof v === "number" && v >= -90 && v <= 90,
  lon: (v: unknown) => typeof v === "number" && v >= -180 && v <= 180,
  geozoneId: (v: unknown) => typeof v === "string" && v.length > 0,
  eventType: (v: unknown) => v === "entry" || v === "exit",
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ok, remaining } = checkRateLimit(`geoevent:${userId}`)
  if (!ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const { lat, lon, geozoneId, eventType, deviceInfo } = body as Record<
    string,
    unknown
  >

  if (
    !geoeventSchema.lat(lat) ||
    !geoeventSchema.lon(lon) ||
    !geoeventSchema.geozoneId(geozoneId) ||
    !geoeventSchema.eventType(eventType)
  ) {
    return NextResponse.json(
      { error: "Invalid input: lat, lon, geozoneId, eventType required" },
      { status: 400 }
    )
  }

  // Parameterized query: verify point is inside geozone
  const geozoneResult = await prisma.$queryRaw<
    { id: string; project_id: string }[]
  >(
    Prisma.sql`
      SELECT id, project_id
      FROM geozones
      WHERE id = ${geozoneId}
        AND is_active = true
        AND ST_Contains(
          geom,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
        )
    `
  )

  if (!geozoneResult.length) {
    return NextResponse.json(
      { error: "Outside geozone or invalid geozone" },
      { status: 400 }
    )
  }

  const { project_id: projectId } = geozoneResult[0]

  // Ensure user exists in our DB (sync from Clerk if needed)
  const { orgId } = await auth()
  let user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        orgId: orgId ?? "org_default",
        email: null,
        role: "worker",
        firstName: null,
        lastName: null,
        status: "active",
        updatedAt: new Date(),
      },
    })
  }

  const now = new Date()
  const dateStr = now.toISOString().split("T")[0]

  if (eventType === "entry") {
    // Check for existing open entry
    const openEntry = await prisma.timesheet.findFirst({
      where: { userId, clockOut: null },
    })
    if (openEntry) {
      return NextResponse.json(
        { error: "Already clocked in", timesheetId: openEntry.id },
        { status: 400 }
      )
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        projectId,
        geozoneId,
        date: dateStr,
        clockIn: now,
        source: "geofence",
        status: "pending",
        durationMinutes: 0,
        breakMinutes: 0,
        overtimeMinutes: 0,
        updatedAt: now,
      },
    })

    // Insert geolog (coords via raw SQL)
    await prisma.$executeRaw`
      INSERT INTO geologs (id, user_id, geozone_id, event_type, coords, device_info)
      VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${geozoneId},
        'entry',
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
        ${deviceInfo ? JSON.stringify(deviceInfo) : null}::jsonb
      )
    `

    return NextResponse.json({ success: true, timesheetId: timesheet.id })
  }

  if (eventType === "exit") {
    const openEntry = await prisma.timesheet.findFirst({
      where: { userId, clockOut: null },
    })

    if (!openEntry) {
      return NextResponse.json(
        { error: "No open timesheet to close" },
        { status: 400 }
      )
    }

    const durationMs = now.getTime() - openEntry.clockIn.getTime()
    const durationMinutes = Math.floor(durationMs / 60000)

    await prisma.timesheet.update({
      where: { id: openEntry.id },
      data: {
        clockOut: now,
        durationMinutes,
        updatedAt: now,
      },
    })

    // Insert geolog (use geozoneId from request - we validated we're inside it)
    const exitGeozoneId = openEntry.geozoneId ?? geozoneId
    if (exitGeozoneId) {
      await prisma.$executeRaw`
        INSERT INTO geologs (id, user_id, geozone_id, event_type, coords, device_info)
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${exitGeozoneId},
          'exit',
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
          ${deviceInfo ? JSON.stringify(deviceInfo) : null}::jsonb
        )
      `
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid eventType" }, { status: 400 })
}
