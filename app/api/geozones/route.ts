import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdminOrManager } from "@/lib/auth"
import { Prisma } from "@/generated/prisma"

export async function GET(_req: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdminOrManager(orgRole as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = orgId ?? "org_default"

  const rows = await prisma.$queryRaw<
    { id: string; name: string; color: string | null; st_asgeojson: string }[]
  >(
    Prisma.sql`
      SELECT g.id, g.name, g.color, ST_AsGeoJSON(g.geom) as st_asgeojson
      FROM geozones g
      JOIN projects p ON g.project_id = p.id
      WHERE p.org_id = ${org} AND g.geom IS NOT NULL
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
