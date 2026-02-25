"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPlus, ChevronDown, Mail } from "lucide-react"
import { UserCreateDialog } from "./user-create-dialog"
import { UserInviteDialog } from "./user-invite-dialog"

export function UserInviteButton() {
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add new user
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setInviteOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Invite by email
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}
