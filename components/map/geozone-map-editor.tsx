"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import Map from "react-map-gl/mapbox"
import MapboxDraw from "@mapbox/mapbox-gl-draw"
import type { MapRef } from "react-map-gl/mapbox"
import { Search, MapPin, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import "mapbox-gl/dist/mapbox-gl.css"
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
// Default: Unit 6 ADF Centre, Vonkel Street, Saxenburg Park 2, Blackheath (NXT Level Tech)
const DEFAULT_CENTER = { lng: 18.70485, lat: -33.96386 }

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

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
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    map.addControl(draw, isMobile ? "bottom-right" : "top-right")
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
  }, [addInitialPolygon, emitChange, isMobile])

  useEffect(() => () => cleanupRef.current?.(), [])

  // Reposition draw controls when isMobile changes
  useEffect(() => {
    const map = mapRef.current?.getMap()
    const draw = drawRef.current
    if (!map || !draw) return
    map.removeControl(draw)
    map.addControl(draw, isMobile ? "bottom-right" : "top-right")
  }, [isMobile])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=za&limit=5`,
          { headers: { "Accept-Language": "en" } }
        )
        const data = (await res.json()) as NominatimResult[]
        setSearchResults(data)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const flyToLocation = useCallback((lng: number, lat: number) => {
    const map = mapRef.current?.getMap()
    if (map) map.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 })
    setSearchQuery("")
    setSearchResults([])
  }, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex justify-center items-center rounded-lg border bg-muted/50" style={{ height }}>
        <p className="text-sm text-muted-foreground">Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable map</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border">
      <div className="relative border-b bg-background">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search address or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-h-[44px] h-10 pl-9 pr-12 rounded-none border-0 focus-visible:ring-0 md:h-10 md:min-h-0"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
          title="Clear polygon"
          onClick={() => onChange([])}
        >
          <Trash2 className="size-4" />
        </Button>
        {(searchResults.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-0 max-h-48 overflow-auto border bg-popover shadow-md">
            {searching ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : (
              searchResults.map((f) => (
                <button
                  key={f.place_id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    "transition-colors"
                  )}
                  onClick={() => flyToLocation(parseFloat(f.lon), parseFloat(f.lat))}
                >
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{f.display_name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: initialCoordinates?.[0]?.[0] ?? DEFAULT_CENTER.lng,
          latitude: initialCoordinates?.[0]?.[1] ?? DEFAULT_CENTER.lat,
          zoom: 14,
        }}
        style={{ width: "100%", height }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={onLoad}
      />
    </div>
  )
}
