"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { GeozoneMapEditor } from "@/components/map/geozone-map-editor"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  radiusM: z.coerce.number().min(0).optional(),
  color: z.string().default("#4f46e5"),
  isActive: z.boolean().default(true),
  polygon: z.string().refine((s) => {
    try {
      const arr = JSON.parse(s) as unknown[]
      return Array.isArray(arr) && arr.length >= 4 && arr.every(
        (p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number"
      )
    } catch {
      return false
    }
  }, "Polygon: JSON array of [lng, lat] with at least 4 points, e.g. [[18.69,-33.96],[18.71,-33.96],[18.71,-33.95],[18.69,-33.95],[18.69,-33.96]]"),
})

type FormData = z.infer<typeof schema>

export function GeozoneForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      radiusM: 150,
      color: "#4f46e5",
      isActive: true,
      polygon: "[[18.69485,-33.97386],[18.71485,-33.97386],[18.71485,-33.95386],[18.69485,-33.95386],[18.69485,-33.97386]]",
    },
  })

  async function onSubmit(data: FormData) {
    try {
      const polygon = JSON.parse(data.polygon) as [number, number][]
      const res = await fetch(`/api/projects/${projectId}/geozones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          radiusM: data.radiusM,
          color: data.color,
          isActive: data.isActive,
          polygon,
        }),
      })
      if (!res.ok) {
        let errMsg = "Failed to create geozone"
        try {
          const text = await res.text()
          if (text) {
            const err = JSON.parse(text) as { error?: string }
            errMsg = err.error ?? errMsg
          }
        } catch {
          // empty or invalid response body
        }
        throw new Error(errMsg)
      }
      toast.success("Geozone created")
      router.push(`/dashboard/projects/${projectId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create geozone")
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Geozone details</CardTitle>
        <CardDescription>
          Search for an address to jump to a location, then use the polygon tool to draw the geofence boundary.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="geozone-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Main site" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Optional" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="radiusM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Radius (m)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} className="h-10 w-20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <FormLabel>Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="polygon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Polygon</FormLabel>
                  <GeozoneMapEditor
                    initialCoordinates={(() => {
                      try {
                        const arr = JSON.parse(field.value) as [number, number][]
                        return Array.isArray(arr) && arr.length >= 3 ? arr : undefined
                      } catch {
                        return undefined
                      }
                    })()}
                    onChange={(coords) => {
                      const closed = coords.length >= 3 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
                        ? coords.slice(0, -1)
                        : coords
                      field.onChange(JSON.stringify(closed))
                    }}
                  />
                  <FormControl>
                    <input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="geozone-form" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create geozone"}
        </Button>
      </CardFooter>
    </Card>
  )
}
