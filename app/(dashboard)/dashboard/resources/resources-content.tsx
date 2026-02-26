"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const schema = z.object({
  saturdayMultiplier: z.coerce.number().min(0).max(10),
  sundayMultiplier: z.coerce.number().min(0).max(10),
  weekdayMultiplier: z.coerce.number().min(0).max(10),
})

type FormData = z.infer<typeof schema>

export function ResourcesContent() {
  const [loading, setLoading] = useState(true)
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      saturdayMultiplier: 1.5,
      sundayMultiplier: 2,
      weekdayMultiplier: 1,
    },
  })

  useEffect(() => {
    fetch("/api/resources/overtime")
      .then((r) => r.json())
      .then((data) => {
        form.reset({
          saturdayMultiplier: data.saturdayMultiplier ?? 1.5,
          sundayMultiplier: data.sundayMultiplier ?? 2,
          weekdayMultiplier: data.weekdayMultiplier ?? 1,
        })
      })
      .catch(() => toast.error("Failed to load overtime policy"))
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch("/api/resources/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to update")
      }
      toast.success("Overtime policy updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <FormField
          control={form.control}
          name="saturdayMultiplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Saturday multiplier</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min={0} max={10} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sundayMultiplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sunday multiplier</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min={0} max={10} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="weekdayMultiplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weekday multiplier (Mon–Fri)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min={0} max={10} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save policy"}
        </Button>
      </form>
    </Form>
  )
}
