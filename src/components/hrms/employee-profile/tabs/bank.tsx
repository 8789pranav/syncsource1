"use client"

// ============================================================
// BankTab — CRUD for EmployeeBankDetail + active account summary.
// ------------------------------------------------------------
// API: /api/employees/[id]/bank
//   • GET  → { items: [...] }
//   • POST → creates a new record (auto-closes previous active)
//   • PATCH /api/employees/[id]/bank/<recordId>
//   • DELETE /api/employees/[id]/bank/<recordId>
// Also uses Employee fields (bankName, accountHolderName, etc.) via `employee` prop.
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Banknote, CreditCard, Wallet, ShieldCheck, Plus, Pencil, Trash2,
  Eye, EyeOff, Loader2, CheckCircle2, Building2, Calendar as CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { SectionCard, StatCard, EmptyState, StatusBadge } from "@/components/hrms/ui"
import { MaskedValue } from "@/components/hrms/permissions/masked-value"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function maskAccount(acc?: string | null, reveal = false): string {
  if (!acc) return "—"
  if (reveal) return acc
  const s = String(acc)
  if (s.length <= 4) return "****" + s
  return "XXXX" + s.slice(-4)
}
function maskIfsc(ifsc?: string | null, reveal = false): string {
  if (!ifsc) return "—"
  return reveal ? ifsc : ifsc.slice(0, 4) + "XXXX"
}

interface BankRec {
  id: string
  bankName: string
  accountHolderName?: string | null
  accountNumber: string
  ifscCode?: string | null
  branchName?: string | null
  accountType?: string | null
  upiId?: string | null
  chequeUrl?: string | null
  isActive: boolean
  verified: boolean
  effectiveDate?: string | null
  endDate?: string | null
}

const EMPTY_FORM = {
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  accountType: "",
  upiId: "",
  effectiveDate: "",
}

const ACCOUNT_TYPES = [
  { label: "Savings", value: "Savings" },
  { label: "Current", value: "Current" },
  { label: "Salary", value: "Salary" },
]

// ---------- main ----------
export default function BankTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [items, setItems] = React.useState<BankRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BankRec | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [revealActive, setRevealActive] = React.useState(false)
  const [revealRowId, setRevealRowId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/bank`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load bank details")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, accountHolderName: employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() : "" })
    setDialogOpen(true)
  }
  const openEdit = (b: BankRec) => {
    setEditing(b)
    setForm({
      bankName: b.bankName || "",
      accountHolderName: b.accountHolderName || "",
      accountNumber: b.accountNumber || "",
      ifscCode: b.ifscCode || "",
      branchName: b.branchName || "",
      accountType: b.accountType || "",
      upiId: b.upiId || "",
      effectiveDate: b.effectiveDate ? b.effectiveDate.slice(0, 10) : "",
    })
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.bankName.trim()) { toast.error("Bank name is required"); return }
    if (!form.accountNumber.trim()) { toast.error("Account number is required"); return }
    setSaving(true)
    try {
      const payload: any = {
        bankName: form.bankName.trim(),
        accountHolderName: form.accountHolderName || null,
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode || null,
        branchName: form.branchName || null,
        accountType: form.accountType || null,
        upiId: form.upiId || null,
        effectiveDate: form.effectiveDate || null,
      }
      const url = editing
        ? `/api/employees/${employeeId}/bank/${editing.id}`
        : `/api/employees/${employeeId}/bank`
      const method = editing ? "PATCH" : "POST"
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Failed (${res.status})`)
      }
      toast.success(editing ? "Bank account updated" : "Bank account added")
      setDialogOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onVerify = async (b: BankRec) => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/bank/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Bank account verified")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to verify")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/bank/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Bank account removed")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const active = items.find((b) => b.isActive) || items[0] || null
  const history = items.filter((b) => !b.isActive)
  const verifiedCount = items.filter((b) => b.verified).length

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
  }

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-5">
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bank Details</h2>
          <p className="text-sm text-muted-foreground">Manage salary credit bank account(s) and history</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> {active ? "Change Bank Account" : "Add Bank Account"}
        </Button>
      </motion.div>

      {/* Security note */}
      <motion.div variants={itemVariants} className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">Only HR / Payroll admin should view the full account number. Numbers are masked by default.</p>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Accounts" value={items.length} icon={CreditCard} accent="emerald" sub="On file" />
        <StatCard label="Active" value={active ? 1 : 0} icon={Wallet} accent="cyan" sub="Salary credit" />
        <StatCard label="Verified" value={verifiedCount} icon={CheckCircle2} accent="amber" sub="Proof checked" />
        <StatCard label="Previous" value={history.length} icon={Banknote} accent="fuchsia" sub="Closed accounts" />
      </motion.div>

      {/* Active account */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : active ? (
          <SectionCard
            title="Active Salary Account"
            description="Current account used for salary credits"
            action={
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                </Badge>
                {active.verified && (
                  <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field icon={Building2} label="Bank Name" value={active.bankName} />
              <Field icon={CreditCard} label="Account Holder" value={active.accountHolderName || "—"} />
              <Field
                icon={Banknote}
                label="Account Number"
                value={
                  <MaskedValue module="employees" field="bankAccount" value={active.accountNumber} maskStyle="account" showBadge />
                }
              />
              <Field
                icon={ShieldCheck}
                label="IFSC Code"
                value={
                  <MaskedValue module="employees" field="ifsc" value={active.ifscCode} maskStyle="ifsc" />
                }
              />
              <Field icon={Building2} label="Branch" value={active.branchName || "—"} />
              <Field icon={CreditCard} label="Account Type" value={active.accountType || "—"} />
              {active.upiId && <Field icon={Wallet} label="UPI ID" value={active.upiId} />}
              <Field icon={CalendarIcon} label="Effective From" value={fmtDate(active.effectiveDate)} />
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(active)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {!active.verified && (
                  <Button variant="outline" size="sm" onClick={() => onVerify(active)} disabled={saving} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard>
            <EmptyState
              icon={Banknote}
              title="No bank account added yet"
              description="Click 'Add Bank Account' to set up salary credit details."
              action={
                <Button size="sm" onClick={openAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Bank Account
                </Button>
              }
            />
          </SectionCard>
        )}
      </motion.div>

      {/* History */}
      {history.length > 0 && (
        <motion.div variants={itemVariants}>
          <SectionCard title="Bank Account History" description="Previous salary accounts">
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase">Bank</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Account</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Effective</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">End Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {history.map((b) => (
                      <motion.tr
                        key={b.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/30"
                      >
                        <TableCell className="text-sm font-medium">{b.bankName}</TableCell>
                        <TableCell className="text-sm font-mono">
                          <MaskedValue module="employees" field="bankAccount" value={b.accountNumber} maskStyle="account" />
                        </TableCell>
                        <TableCell className="text-sm">{b.accountType || "—"}</TableCell>
                        <TableCell className="text-sm">{fmtDate(b.effectiveDate)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(b.endDate)}</TableCell>
                        <TableCell>
                          {b.verified ? (
                            <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(b)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(b.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bank Account" : active ? "Change Bank Account" : "Add Bank Account"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the bank account details below." : active ? "Adding a new active account will close the current one." : "Enter salary credit bank account details."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Bank Name <span className="text-destructive">*</span></Label>
              <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Account Holder Name</Label>
              <Input value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} placeholder="As per bank records" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Number <span className="text-destructive">*</span></Label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Account number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IFSC Code</Label>
              <Input value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })} placeholder="HDFC0001234" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch Name</Label>
              <Input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} placeholder="Branch" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Type</Label>
              <Select value={form.accountType || ""} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UPI ID</Label>
              <Input value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="name@bank" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effective Date</Label>
              <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Save Changes" : "Add Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bank account?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The bank account record will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ---------- subcomponents ----------
function Field({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}
