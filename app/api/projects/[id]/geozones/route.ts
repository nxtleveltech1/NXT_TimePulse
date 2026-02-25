import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { Prisma } from "@/generated/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const url = new URL(req.url)
  const withGeometry = url.searchParams.get("withGeometry") === "true"

  if (withGeometry) {
    const rows = await prisma.$queryRaw<
      { id: string; name: string; color: string | null; st_asgeojson: string }[]
    >(
      Prisma.sql`
        SELECT g.id, g.name, g.color, ST_AsGeoJSON(g.geom) as st_asgeojson
        FROM geozones g
        WHERE g.project_id = ${id} AND g.geom IS NOT NULL
        ORDER BY g.created_at DESC
      `
    )
    const geozones = rows.map((r) => {
      const geojson = JSON.parse(r.st_asgeojson) as {
        type: string
        coordinates: number[][][]
      }
      if (geojson.type !== "Polygon" || !geojson.coordinates?.[0]) return null
      const coordinates = geojson.coordinates[0].map(
        ([lng, lat]) => [lng, lat] as [number, number]
      )
      return {
        id: r.id,
        name: r.name,
        color: r.color ?? "#4f46e5",
        coordinates,
      }
    })
    return NextResponse.json(
      geozones.filter((g): g is NonNullable<typeof g> => g !== null)
    )
  }

  const geozones = await prisma.geozone.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(geozones)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = typeof b.name === "string" ? b.name : ""
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const polygon = b.polygon as [number, number][] | undefined
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return NextResponse.json(
      { error: "polygon required: array of [lng, lat] with at least 3 points" },
      { status: 400 }
    )
  }

  const coords = polygon.map((p) => {
    const arr = Array.isArray(p) ? p : [0, 0]
    return [Number(arr[0]), Number(arr[1])] as [number, number]
  })
  const wkt = `POLYGON((${coords.map((c) => `${c[0]} ${c[1]}`).join(",")},${coords[0][0]} ${coords[0][1]}))`

  const geozone = await prisma.geozone.create({
    data: {
      projectId,
      name,
      description: typeof b.description === "string" ? b.description : "",
      radiusM: typeof b.radiusM === "number" ? b.radiusM : null,
      color: typeof b.color === "string" ? b.color : "#4f46e5",
      isActive: typeof b.isActive === "boolean" ? b.isActive : true,
    },
  })

  await prisma.$executeRaw`
    UPDATE geozones SET geom = ST_SetSRID(ST_GeomFromText(${wkt}), 4326) WHERE id = ${geozone.id}
  `

  const updated = await prisma.geozone.findUnique({ where: { id: geozone.id } })
  return NextResponse.json(updated ?? geozone)
}
