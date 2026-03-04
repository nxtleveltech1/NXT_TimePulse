"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminOrManager } from "@/lib/auth"

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  client: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "completed"]).default("active"),
  defaultRate: z.number().positive().optional(),
  address: z.string().optional(),
})

export async function createProject(formData: FormData) {
  const access = await requireAdminOrManager()
  if (!access) throw new Error("Forbidden")

  const raw = {
    name: formData.get("name"),
    client: formData.get("client") || undefined,
    description: formData.get("description") || undefined,
    status: formData.get("status") || "active",
    defaultRate: formData.get("defaultRate") ? Number(formData.get("defaultRate")) : undefined,
    address: formData.get("address") || undefined,
  }

  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid input")
  }

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      orgId: access.orgId,
      updatedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: access.userId,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
      details: `Project created: ${project.name}`,
    },
  })

  revalidatePath("/dashboard/projects")
  redirect(`/dashboard/projects/${project.id}`)
}

export async function deleteProject(projectId: string) {
  const access = await requireAdminOrManager()
  if (!access) throw new Error("Forbidden")

  await prisma.project.delete({
    where: { id: projectId, orgId: access.orgId },
  })

  await prisma.auditLog.create({
    data: {
      userId: access.userId,
      action: "project.deleted",
      entityType: "project",
      entityId: projectId,
      details: "Project deleted",
    },
  })

  revalidatePath("/dashboard/projects")
  redirect("/dashboard/projects")
}

export async function updateProject(projectId: string, data: {
  name?: string
  client?: string
  description?: string
  status?: string
  defaultRate?: number
  address?: string
  isBillable?: boolean
}) {
  const access = await requireAdminOrManager()
  if (!access) throw new Error("Forbidden")

  const updated = await prisma.project.update({
    where: { id: projectId, orgId: access.orgId },
    data: { ...data, updatedAt: new Date() },
  })

  revalidatePath("/dashboard/projects")
  revalidatePath(`/dashboard/projects/${projectId}`)
  return updated
}
