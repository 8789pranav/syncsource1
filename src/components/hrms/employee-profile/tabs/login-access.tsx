"use client"

// ============================================================
// LoginAccessTab — manage system login.
// API: /api/employees/[id]/login-access (GET list, POST create,
// PATCH by recordId).
// SECURITY: Only admin should access.
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  KeyRound, ShieldAlert, ShieldCheck, Plus, Ban, Power, RefreshCw,
  Lock, Unlock, Smartphone, LogOut, Mail, Clock, Wifi, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface LoginAccessRec {
  id: string
  username?: string | null
  email?: string | null
  status: string
  role?: string | null
  twoFactorEnabled: boolean
  forcePasswordChange: boolean
  passwordResetAt?: string | Date | null
  lastLoginAt?: string | Date | null
  lastLoginIp?: string | null
  activeSessions: number
  createdAt: string | Date
}

// ---------- helpers ----------

const ROLES = [
  "Employee", "Manager", "HR admin", "Payroll admin",
  "Finance admin", "IT admin", "Auditor", "Sub-admin",
] as const

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Inactive: "bg-muted text-muted-foreground",
  Blocked: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Locked: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

function fmtDateTime(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a") } catch { return "—" }
}

// ============================================================
// Component
// ============================================================

export default function LoginAccessTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<LoginAccessRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [blockTarget, setBlockTarget] = React.useState<LoginAccessRec | null>(null)
  const [logoutTarget, setLogoutTarget] = React.useState<LoginAccessRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/login-access`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load login access")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load login access")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const rec = items[0] || null

  async function patch(rec: LoginAccessRec, payload: any, successMsg: string, extraToast?: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/login-access/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(successMsg)
      if (extraToast) toast.info(extraToast)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            Login Access
            <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 dark:border-rose-500/30 dark:text-rose-400">
              <ShieldAlert className="h-3 w-3" /> Admin only
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Manage the employee's system login account, status, 2FA, password reset, and active sessions.
          </p>
        </div>
        {!rec && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Create Login
          </Button>
        )}
      </div>

      {/* Security banner */}
      <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 flex items-start gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <p className="text-rose-700 dark:text-rose-300">
          <strong>Security-sensitive area.</strong> Only administrators should access this section. All actions are logged.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !rec ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={KeyRound}
            title="No login access"
            description="This employee does not have a system login account yet."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Login</Button>}
          />
        </div>
      ) : (
        <SectionCard
          title="Login Account"
          action={
            <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[rec.status] || "bg-muted text-muted-foreground")}>
              {rec.status}
            </Badge>
          }
        >
          <div className="space-y-4">
            {/* Account info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItem icon={KeyRound} label="Username" value={rec.username || "—"} mono />
              <InfoItem icon={Mail} label="Email" value={rec.email || "—"} />
              <InfoItem icon={ShieldCheck} label="Role" value={rec.role || "—"} />
              <InfoItem
                icon={Smartphone}
                label="2FA"
                value={
                  <Badge variant="outline" className={rec.twoFactorEnabled ? "text-emerald-600 border-emerald-200 dark:border-emerald-500/30 dark:text-emerald-400" : "text-muted-foreground"}>
                    {rec.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                }
              />
              <InfoItem
                icon={Lock}
                label="Force password change"
                value={
                  <Badge variant="outline" className={rec.forcePasswordChange ? "text-amber-600 border-amber-200 dark:border-amber-500/30 dark:text-amber-400" : "text-muted-foreground"}>
                    {rec.forcePasswordChange ? "Required" : "Not required"}
                  </Badge>
                }
              />
              <InfoItem icon={Clock} label="Password reset at" value={fmtDateTime(rec.passwordResetAt)} />
              <InfoItem icon={Clock} label="Last login" value={fmtDateTime(rec.lastLoginAt)} />
              <InfoItem icon={Wifi} label="Last login IP" value={rec.lastLoginIp || "—"} mono />
              <InfoItem icon={LogOut} label="Active sessions" value={String(rec.activeSessions)} />
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-2">
              {rec.status === "Active" ? (
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => patch(rec, { status: "Inactive" }, "Account deactivated")}>
                  <Power className="h-4 w-4" /> Deactivate
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => patch(rec, { status: "Active" }, "Account activated")}>
                  <Power className="h-4 w-4" /> Activate
                </Button>
              )}
              {rec.status !== "Blocked" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                  onClick={() => setBlockTarget(rec)}>
                  <Ban className="h-4 w-4" /> Block User
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => patch(rec, { resetPassword: true }, "Password reset email sent", "Reset instructions emailed to user")}>
                <RefreshCw className="h-4 w-4" /> Reset Password
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => patch(rec, { twoFactorEnabled: !rec.twoFactorEnabled }, `2FA ${!rec.twoFactorEnabled ? "enabled" : "disabled"}`)}>
                {rec.twoFactorEnabled ? <><Unlock className="h-4 w-4" /> Disable 2FA</> : <><Lock className="h-4 w-4" /> Enable 2FA</>}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                onClick={() => setLogoutTarget(rec)}>
                <LogOut className="h-4 w-4" /> Logout All Devices
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Create Login dialog */}
      <CreateLoginDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employeeId={employeeId}
        employee={employee}
        onCreated={load}
      />

      {/* Block confirm */}
      <AlertDialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will block {blockTarget?.username || "this user"} from logging in. They will need an admin to unblock their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (blockTarget) patch(blockTarget, { block: true }, "User blocked")
                setBlockTarget(null)
              }}>
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout confirm */}
      <AlertDialog open={!!logoutTarget} onOpenChange={(o) => !o && setLogoutTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end all {logoutTarget?.activeSessions || 0} active session(s) for {logoutTarget?.username || "this user"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (logoutTarget) patch(logoutTarget, { activeSessions: 0 }, "Logged out from all devices")
                setLogoutTarget(null)
              }}>
              Logout All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// InfoItem
// ============================================================

function InfoItem({
  icon: Icon, label, value, mono,
}: {
  icon: any; label: string; value: React.ReactNode; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={cn("text-sm font-medium mt-0.5 break-words", mono && "font-mono text-xs")}>
          {value}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Create Login Dialog
// ============================================================

function CreateLoginDialog({
  open, onOpenChange, employeeId, employee, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  employee: any
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    username: "",
    email: "",
    role: "Employee",
    twoFactorEnabled: false,
    forcePasswordChange: true,
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      // Suggest username/email from employee record
      const empEmail = employee?.personalEmail || employee?.workEmail || ""
      const empUsername = (employee?.employeeCode || "").toLowerCase() || ""
      setForm({
        username: empUsername,
        email: empEmail,
        role: "Employee",
        twoFactorEnabled: false,
        forcePasswordChange: true,
      })
    }
  }, [open, employee])

  async function handleSubmit() {
    if (!form.username.trim() || !form.email.trim()) {
      toast.error("Username and email are required")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/login-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          role: form.role,
          twoFactorEnabled: form.twoFactorEnabled,
          forcePasswordChange: form.forcePasswordChange,
          status: "Active",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create login")
      toast.success("Login account created. Welcome email sent.")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to create login")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Login Account
          </DialogTitle>
          <DialogDescription>
            Provision a new system login for this employee. A welcome email with setup instructions will be sent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Username <span className="text-rose-500">*</span></Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. jdoe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-rose-500">*</span></Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium">2FA</span>
              </div>
              <Switch
                checked={form.twoFactorEnabled}
                onCheckedChange={(c) => setForm({ ...form, twoFactorEnabled: c })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">Force pwd change</span>
              </div>
              <Switch
                checked={form.forcePasswordChange}
                onCheckedChange={(c) => setForm({ ...form, forcePasswordChange: c })}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
