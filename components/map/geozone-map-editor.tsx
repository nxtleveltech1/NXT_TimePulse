"use client"

import { useRef, useCallback, useEffect } from "react"
import Map from "react-map-gl/mapbox"
import MapboxDraw from "@mapbox/mapbox-gl-draw"
import type { MapRef } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

type Coord = [number, number]

export function GeozoneMapEditor({
  initialCoordinates,
  onChange,
  height = 300,
}: {
  initialCoordinates?: Coord[]
  onChange: (coords: Coord[]) => void
  height?: number
}) {
  const mapRef = useRef<MapRef>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const initialSetRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const emitChange = useCallback(() => {
    const draw = drawRef.current
    if (!draw) return
    const data = draw.getAll()
    const poly = data.features.find((f) => f.geometry.type === "Polygon")
    if (poly && poly.geometry.type === "Polygon" && poly.geometry.coordinates[0]) {
      const coords = poly.geometry.coordinates[0].map(([lng, lat]) => [lng, lat] as Coord)
      onChange(coords)
    } else {
      onChange([])
    }
  }, [onChange])

  const addInitialPolygon = useCallback(() => {
    const draw = drawRef.current
    if (!draw || !initialCoordinates || initialCoordinates.length < 3 || initialSetRef.current) return
    initialSetRef.current = true
    const closed = [...initialCoordinates, initialCoordinates[0]]
    draw.add({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [closed],
      },
    })
    emitChange()
  }, [initialCoordinates, emitChange])

  useEffect(() => {
    if (drawRef.current && initialCoordinates && initialCoordinates.length >= 3) {
      addInitialPolygon()
    }
  }, [initialCoordinates, addInitialPolygon])

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !MAPBOX_TOKEN) return

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    })
    map.addControl(draw, "top-right")
    drawRef.current = draw

    addInitialPolygon()

    const onDraw = () => emitChange()
    map.on("draw.create", onDraw)
    map.on("draw.update", onDraw)
    map.on("draw.delete", onDraw)

    cleanupRef.current = () => {
      map.off("draw.create", onDraw)
      map.off("draw.update", onDraw)
      map.off("draw.delete", onDraw)
      map.removeControl(draw)
      drawRef.current = null
    }
  }, [addInitialPolygon, emitChange])

  useEffect(() => () => cleanupRef.current?.(), [])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/50" style={{ height }}>
        <p className="text-sm text-muted-foreground">Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable map</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: initialCoordinates?.[0]?.[0] ?? -74.006,
          latitude: initialCoordinates?.[0]?.[1] ?? 40.7128,
          zoom: 14,
        }}
        style={{ width: "100%", height }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={onLoad}
      />
    </div>
  )
}
