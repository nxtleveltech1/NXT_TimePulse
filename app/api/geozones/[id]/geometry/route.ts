import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { Prisma } from "@/generated/prisma"

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
  const result = await prisma.$queryRaw<{ st_asgeojson: string }[]>(
    Prisma.sql`
      SELECT ST_AsGeoJSON(geom) as st_asgeojson
      FROM geozones
      WHERE id = ${id} AND geom IS NOT NULL
    `
  )
  if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const geojson = JSON.parse(result[0].st_asgeojson) as { type: string; coordinates: number[][][] }
  if (geojson.type !== "Polygon" || !geojson.coordinates?.[0]) {
    return NextResponse.json({ error: "Invalid geometry" }, { status: 400 })
  }
  const coordinates = geojson.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number])
  return NextResponse.json({ coordinates })
}
