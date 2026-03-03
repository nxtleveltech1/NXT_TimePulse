"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type UserCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserCreateDialog({ open, onOpenChange }: UserCreateDialogProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"admin" | "manager" | "worker">("worker")
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{
    email: string
    firstName: string
    lastName: string
    message?: string
  } | null>(null)

  function reset() {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setRole("worker")
    setResult(null)
  }

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error ?? (data.details ? JSON.stringify(data.details) : "Failed to create user")
        throw new Error(msg)
      }
      setResult({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        message: data.message,
      })
      toast.success("User created")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? "User created" : "Add new user"}</DialogTitle>
          <DialogDescription>
            {result
              ? "User was created successfully."
              : "Create a user with name, email, and mobile. They should reset their password on first sign-in."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium">
                {result.firstName} {result.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{result.email}</p>
              <p className="text-xs text-muted-foreground">
                {result.message ?? "Ask the user to reset their password on first sign-in."}
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-phone">Mobile number</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "admin" | "manager" | "worker")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={creating}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !firstName.trim() || !lastName.trim() || !email.trim()}
              >
                {creating ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
