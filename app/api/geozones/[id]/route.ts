import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const geozone = await prisma.geozone.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!geozone) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(geozone)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const data: Record<string, unknown> = {}
  if (typeof b.name === "string") data.name = b.name
  if (typeof b.description === "string") data.description = b.description
  if (typeof b.radiusM === "number") data.radiusM = b.radiusM
  if (typeof b.color === "string") data.color = b.color
  if (typeof b.isActive === "boolean") data.isActive = b.isActive

  const polygon = b.polygon as [number, number][] | undefined
  if (polygon && Array.isArray(polygon) && polygon.length >= 3) {
    const coords = polygon.map((p) => {
      const arr = Array.isArray(p) ? p : [0, 0]
      return [Number(arr[0]), Number(arr[1])] as [number, number]
    })
    const wkt = `POLYGON((${coords.map((c) => `${c[0]} ${c[1]}`).join(",")},${coords[0][0]} ${coords[0][1]}))`
    await prisma.$executeRaw`
      UPDATE geozones SET geom = ST_SetSRID(ST_GeomFromText(${wkt}), 4326) WHERE id = ${id}
    `
  }

  const geozone = await prisma.geozone.update({
    where: { id },
    data: data as Parameters<typeof prisma.geozone.update>[0]["data"],
  })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "geozone.updated",
      entityType: "geozone",
      entityId: id,
      details: `Geozone updated: ${geozone.name}`,
    },
  })
  return NextResponse.json(geozone)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const geozone = await prisma.geozone.findUnique({ where: { id } })
  if (!geozone) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.geozone.delete({ where: { id } })
  await prisma.auditLog.create({
    data: {
      userId,
      action: "geozone.deleted",
      entityType: "geozone",
      entityId: id,
      details: `Geozone deleted: ${geozone.name}`,
    },
  })
  return NextResponse.json({ success: true })
}
