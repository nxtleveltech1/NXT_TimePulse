"use client"

import { useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { MoreHorizontal, Pencil, UserMinus, Wallet } from "lucide-react"
import { UserEditDialog } from "./user-edit-dialog"
import { UserRemoveDialog } from "./user-remove-dialog"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

export type UserWithCount = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  _count: { timesheets: number; allocations: number }
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  suspended: "secondary",
  offboarded: "destructive",
  archived: "outline",
}

export function UsersTable({
  users,
  currentUserId,
  canManageComp,
}: {
  users: UserWithCount[]
  currentUserId: string
  canManageComp: boolean
}) {
  const { orgRole } = useAuth()
  const userIsAdmin = orgRole === "org:admin"
  const [editingUser, setEditingUser] = useState<UserWithCount | null>(null)
  const [removingUser, setRemovingUser] = useState<UserWithCount | null>(null)

  const columns: ColumnDef<UserWithCount>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "firstName",
      id: "name",
      accessorFn: (row) => [row.firstName, row.lastName].filter(Boolean).join(" ") || "-",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(" ") || "-"
        return (
          <Link
            href={`/dashboard/users/${row.original.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {name}
          </Link>
        )
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ getValue }) => getValue() ?? "-",
    },
    {
      accessorKey: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="capitalize">
          {getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ getValue }) => {
        const status = getValue() as string
        return (
          <Badge variant={statusVariant[status] ?? "secondary"} className="capitalize">
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "_count.timesheets",
      id: "timesheets",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timesheets" />,
    },
    {
      accessorKey: "_count.allocations",
      id: "allocations",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Allocations" />,
    },
    {
      id: "actions",
      enableHiding: false,
      size: 60,
      cell: ({ row }) => {
        const u = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canManageComp && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/resources/users/${u.id}`}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Manage rates
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setEditingUser(u)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit role/status
              </DropdownMenuItem>
              {u.id !== currentUserId && (
                <DropdownMenuItem
                  onClick={() => setRemovingUser(u)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        searchColumn="name"
        searchPlaceholder="Search users..."
        pageSize={20}
      />
      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
      {removingUser && (
        <UserRemoveDialog
          user={removingUser}
          open={!!removingUser}
          onOpenChange={(open) => !open && setRemovingUser(null)}
          isAdmin={userIsAdmin}
        />
      )}
    </>
  )
}
