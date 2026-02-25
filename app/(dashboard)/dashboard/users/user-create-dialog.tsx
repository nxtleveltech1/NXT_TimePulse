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
import { Copy, Check } from "lucide-react"
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
    temporaryPassword: string
    firstName: string
    lastName: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

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
        temporaryPassword: data.temporaryPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      })
      toast.success("User created")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.temporaryPassword)
    setCopied(true)
    toast.success("Password copied")
    setTimeout(() => setCopied(false), 2000)
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
              ? "Share the temporary password with the user. They should change it on first login."
              : "Create a user with name, email, and mobile. A password will be generated."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium">
                {result.firstName} {result.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{result.email}</p>
              <div className="space-y-2">
                <Label className="text-xs">Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={result.temporaryPassword}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Copy and share securely. User should change this on first login.
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
