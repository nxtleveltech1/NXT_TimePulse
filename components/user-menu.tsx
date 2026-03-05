"use client"

import { useUser, useClerk, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  Shield,
  User,
  LogOut,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function mapOrgRole(role: string | undefined): string {
  if (role === "org:admin") return "Admin"
  if (role === "org:manager") return "Manager"
  return "Worker"
}

export function UserMenu() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { orgRole } = useAuth()
  const router = useRouter()

  if (!isLoaded) {
    return (
      <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const firstName = user?.firstName ?? ""
  const lastName = user?.lastName ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User"
  const initials = `${(firstName[0] ?? "N").toUpperCase()}${(lastName[0] ?? "X").toUpperCase()}`
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const imageUrl = user?.imageUrl
  const displayRole = mapOrgRole(orgRole ?? undefined)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={fullName}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold leading-none">{fullName}</p>
            <p className="text-xs text-muted-foreground leading-none">{email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
                <Shield className="size-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {displayRole}
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/account")}
          className="gap-2"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <User className="size-4 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Account</p>
            <p className="text-xs text-muted-foreground">Profile & settings</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: "/" })}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10">
            <LogOut className="size-4 text-destructive" />
          </div>
          <span className="text-sm font-semibold">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
