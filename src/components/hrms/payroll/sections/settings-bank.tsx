"use client"

// =============================================================
// Payroll → Settings → Bank Settings
// Bank account list per entity + file format reference +
// payment approval rules + add account / test file actions.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Landmark, Save, Plus, Star, FlaskConical, CheckCircle2, Clock, X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

import { ENTITIES, BANK_FILE_FORMATS } from "../shared"

interface BankAccount {
  id: string
  entity: string
  bankName: string
  accountNumber: string
  ifsc: string
  fileFormat: string
  isDefault: boolean
  status: "Active" | "Inactive"
}

const INITIAL_ACCOUNTS: BankAccount[] = [
  { id: "ba-1", entity: "ACME India Pvt Ltd", bankName: "HDFC Bank", accountNumber: "5010012345678", ifsc: "HDFC0001234", fileFormat: "HDFC Format", isDefault: true, status: "Active" },
  { id: "ba-2", entity: "ACME UAE LLC", bankName: "Emirates NBD", accountNumber: "012345678901", ifsc: "EBILAEAD", fileFormat: "UAE WPS / SIF", isDefault: true, status: "Active" },
  { id: "ba-3", entity: "ACME US Inc", bankName: "Chase Bank", accountNumber: "1234567890", ifsc: "CHASUS33", fileFormat: "Custom CSV", isDefault: true, status: "Active" },
  { id: "ba-4", entity: "ACME Singapore Pte Ltd", bankName: "DBS Bank", accountNumber: "00123456789", ifsc: "DBSSSGSG", fileFormat: "Custom CSV", isDefault: true, status: "Active" },
]

const FORMATS_INFO: Array<{ format: string; description: string }> = [
  { format: "HDFC Format", description: "HDFC Bank salary disbursement file format (CSV-based)." },
  { format: "ICICI Format", description: "ICICI Bank salary disbursement file format." },
  { format: "SBI Format", description: "State Bank of India salary file format." },
  { format: "Axis Format", description: "Axis Bank salary disbursement file format." },
  { format: "Custom CSV", description: "Generic CSV template with configurable columns." },
  { format: "Custom Excel", description: "Generic Excel template with configurable sheets." },
  { format: "UAE WPS / SIF", description: "UAE Wages Protection System SIF file format." },
  { format: "RTGS / NEFT", description: "Reserve Bank of India RTGS/NEFT bulk payment file." },
]

export function BankSettingsSection() {
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS)
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [approverChain, setApproverChain] = useState("Finance Manager → CFO")
  const [cutoffTime, setCutoffTime] = useState("4:00 PM IST")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<Partial<BankAccount>>({})

  function openAdd() {
    setForm({ entity: ENTITIES[0].name, bankName: "", accountNumber: "", ifsc: "", fileFormat: BANK_FILE_FORMATS[0] as string, isDefault: false, status: "Active" })
    setDialogOpen(true)
  }
  function setField<K extends keyof BankAccount>(k: K, v: BankAccount[K]) { setForm((p) => ({ ...p, [k]: v })) }
  function save() {
    if (!form.bankName || !form.accountNumber) { toast.error("Bank name and account number are required"); return }
    const newA: BankAccount = {
      id: `ba-${Date.now()}`, entity: form.entity!, bankName: form.bankName!,
      accountNumber: form.accountNumber!, ifsc: form.ifsc || "", fileFormat: form.fileFormat || "",
      isDefault: form.isDefault || false, status: form.status || "Active",
    }
    setAccounts((prev) => [...prev, newA])
    toast.success(`Bank account "${newA.bankName}" added`)
    setDialogOpen(false)
  }
  function toggleDefault(id: string) {
    setAccounts((prev) => prev.map((a) => {
      if (a.id === id) return { ...a, isDefault: !a.isDefault }
      const target = prev.find((x) => x.id === id)
      if (target && a.entity === target.entity) return { ...a, isDefault: false }
      return a
    }))
  }
  function testFormat(format: string) {
    toast.success(`Test file generated for "${format}"`, { description: "Sample file saved to downloads." })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Bank Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Bank accounts, file formats and payment approval rules.</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Bank Account
        </Button>
      </div>

      {/* Bank account list */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[480px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent border-border/60">
                  {["Entity", "Bank Name", "Account Number", "IFSC / SWIFT", "File Format", "Default", "Status"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{a.entity}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{a.bankName}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">••••{a.accountNumber.slice(-4)}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">{a.ifsc}</TableCell>
                    <TableCell className="text-xs text-foreground/90">{a.fileFormat}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleDefault(a.id)}>
                        {a.isDefault ? (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 gap-1 cursor-pointer">
                            <Star className="h-3 w-3" /> Default
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="cursor-pointer text-muted-foreground">Set Default</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium border-0", a.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400")}>
                        {a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* File format reference */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <FlaskConical className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">File Format Templates Reference</h3>
            </div>
            <div className="flex flex-col gap-2">
              {FORMATS_INFO.map((f) => (
                <div key={f.format} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{f.format}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 shrink-0" onClick={() => testFormat(f.format)}>
                    <FlaskConical className="h-3 w-3" /> Test
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment approval rules */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Payment Approval Rules</h3>
            </div>
            <Separator />
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-foreground">Approval Required</div>
                <div className="text-xs text-muted-foreground mt-0.5">Bank payment files must be approved before sending.</div>
              </div>
              <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} className="mt-0.5 data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Approver Chain</Label>
              <Select value={approverChain} onValueChange={setApproverChain}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Finance Manager → CFO", "Finance Manager only", "Payroll Admin → Finance Manager", "CFO only"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Payment Cut-Off Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} className="h-9 pl-9" />
              </div>
              <p className="text-[11px] text-muted-foreground">Payments initiated after this time are processed next business day.</p>
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white mt-1 self-start" onClick={() => toast.success("Bank settings saved")}>
              <Save className="h-4 w-4" /> Save Rules
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-slate-600 dark:text-slate-400" /> Add Bank Account
            </DialogTitle>
            <DialogDescription className="text-xs">Add a new salary disbursement bank account.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <FormField label="Entity" full>
              <Select value={form.entity || ""} onValueChange={(v) => setField("entity", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITIES.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Bank Name *"><Input value={form.bankName || ""} onChange={(e) => setField("bankName", e.target.value)} className="h-9" /></FormField>
            <FormField label="Account Number *"><Input value={form.accountNumber || ""} onChange={(e) => setField("accountNumber", e.target.value)} className="h-9" /></FormField>
            <FormField label="IFSC / SWIFT"><Input value={form.ifsc || ""} onChange={(e) => setField("ifsc", e.target.value)} className="h-9" /></FormField>
            <FormField label="File Format">
              <Select value={form.fileFormat || ""} onValueChange={(v) => setField("fileFormat", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{BANK_FILE_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer sm:col-span-2">
              <div className="text-sm font-medium text-foreground">Default for Entity</div>
              <Switch checked={!!form.isDefault} onCheckedChange={(v) => setField("isDefault", v)} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={save}><Save className="h-4 w-4" /> Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}

export default BankSettingsSection
