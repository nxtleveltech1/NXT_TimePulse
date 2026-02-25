"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import type { Geozone } from "@/generated/prisma"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  radiusM: z.coerce.number().min(0).optional(),
  color: z.string().default("#4f46e5"),
  isActive: z.boolean().default(true),
  polygon: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type Coord = [number, number]

export function GeozoneEditForm({ geozone }: { geozone: Geozone }) {
  const router = useRouter()
  const [initialCoords, setInitialCoords] = useState<Coord[] | undefined>(undefined)
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: geozone.name,
      description: geozone.description ?? "",
      radiusM: geozone.radiusM ?? 150,
      color: geozone.color ?? "#4f46e5",
      isActive: geozone.isActive,
      polygon: "",
    },
  })

  useEffect(() => {
    fetch(`/api/geozones/${geozone.id}/geometry`)
      .then((r) => r.json())
      .then((data) => {
        if (data.coordinates?.length >= 3) {
          setInitialCoords(data.coordinates)
          form.setValue("polygon", JSON.stringify(data.coordinates))
        }
      })
      .catch(() => {})
  }, [geozone.id, form])

  async function onSubmit(data: FormData) {
    try {
      const body: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        radiusM: data.radiusM,
        color: data.color,
        isActive: data.isActive,
      }
      if (data.polygon) {
        try {
          body.polygon = JSON.parse(data.polygon) as [number, number][]
        } catch {
          // ignore invalid polygon
        }
      }
      const res = await fetch(`/api/geozones/${geozone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to update geozone")
      }
      toast.success("Geozone updated")
      router.push(`/dashboard/projects/${geozone.projectId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update geozone")
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Geozone details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="geozone-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} rows={2} />
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
                    initialCoordinates={initialCoords}
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
        <Button type="submit" form="geozone-edit-form" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </CardFooter>
    </Card>
  )
}
