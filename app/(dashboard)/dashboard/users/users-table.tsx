"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Pencil, MoreHorizontal, UserMinus, Wallet } from "lucide-react"
import { UserEditDialog } from "./user-edit-dialog"
import { UserRemoveDialog } from "./user-remove-dialog"

export type UserWithCount = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  _count: { timesheets: number; allocations: number }
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserWithCount[]
  currentUserId: string
}) {
  const [editingUser, setEditingUser] = useState<UserWithCount | null>(null)
  const [removingUser, setRemovingUser] = useState<UserWithCount | null>(null)

  if (users.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No users yet. Invite users to get started.
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timesheets</TableHead>
            <TableHead>Allocations</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
              </TableCell>
              <TableCell>{u.email ?? "—"}</TableCell>
              <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
              <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status}</Badge></TableCell>
              <TableCell>{u._count.timesheets}</TableCell>
              <TableCell>{u._count.allocations}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/resources/users/${u.id}`}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Manage rates
                      </Link>
                    </DropdownMenuItem>
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
                        Remove from org
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
        />
      )}
    </>
  )
}
