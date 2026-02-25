"use client"

import { useMemo, useEffect, useState } from "react"
import Map, { Source, Layer } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export type GeozoneWithCoords = {
  id: string
  name: string
  color: string
  coordinates: [number, number][]
}

export function GeozonesMap({
  geozones: geozonesProp,
  projectId,
  height = 300,
}: {
  geozones?: GeozoneWithCoords[]
  projectId?: string
  height?: number
}) {
  const [fetched, setFetched] = useState<GeozoneWithCoords[]>([])
  const geozones = geozonesProp ?? fetched

  useEffect(() => {
    if (geozonesProp) return
    const url = projectId
      ? `/api/projects/${projectId}/geozones?withGeometry=true`
      : "/api/geozones"
    fetch(url)
      .then((r) => r.json())
      .then(setFetched)
      .catch(() => setFetched([]))
  }, [projectId, geozonesProp])

  const geojson = useMemo(() => {
    if (!geozones?.length) return null
    const features = geozones.map((g) => {
      const closed =
        g.coordinates.length >= 3 &&
        g.coordinates[0][0] === g.coordinates[g.coordinates.length - 1][0] &&
        g.coordinates[0][1] === g.coordinates[g.coordinates.length - 1][1]
          ? g.coordinates
          : [...g.coordinates, g.coordinates[0]]
      return {
        type: "Feature" as const,
        properties: { id: g.id, name: g.name, color: g.color },
        geometry: {
          type: "Polygon" as const,
          coordinates: [closed],
        },
      }
    })
    return {
      type: "FeatureCollection" as const,
      features,
    }
  }, [geozones])

  const center = useMemo(() => {
    if (!geozones?.length) return { lng: -74.006, lat: 40.7128 }
    const first = geozones[0].coordinates[0]
    return { lng: first[0], lat: first[1] }
  }, [geozones])

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted/50"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">
          Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable map
        </p>
      </div>
    )
  }

  if (!geojson || geojson.features.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted/50"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No geozones to display</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 12,
        }}
        style={{ width: "100%", height }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <Source id="geozones" type="geojson" data={geojson}>
          <Layer
            id="geozones-fill"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": 0.4,
            }}
          />
          <Layer
            id="geozones-outline"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 2,
            }}
          />
        </Source>
      </Map>
    </div>
  )
}
