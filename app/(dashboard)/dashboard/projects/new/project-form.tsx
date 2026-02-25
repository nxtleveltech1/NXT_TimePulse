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
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  client: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold", "archived"]).default("active"),
  defaultRate: z.coerce.number().min(0).default(0),
})

type FormData = z.infer<typeof schema>

export function ProjectForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      client: "",
      description: "",
      address: "",
      status: "active",
      defaultRate: 0,
    },
  })

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to create project")
      }
      const project = await res.json()
      toast.success("Project created")
      router.push(`/dashboard/projects/${project.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create project")
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Project details</CardTitle>
        <CardDescription>Enter the project information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="project-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Project name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Client name" />
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
                    <Textarea {...field} placeholder="Project description" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Site address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default rate ($/hr)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="project-form" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create project"}
        </Button>
      </CardFooter>
    </Card>
  )
}
