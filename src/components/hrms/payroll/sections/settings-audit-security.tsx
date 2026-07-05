"use client"

// =============================================================
// Payroll → Settings → Audit & Security
// Audit log table + security settings + access control matrix
// + data retention policy.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Lock, Search, Save, ShieldCheck, Clock, Eye, Check, X, Filter,
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

interface AuditLog {
  id: string
  user: string
  action: string
  module: string
  entity: string
  timestamp: string
  ip: string
  details: string
}

const AUDIT_LOGS: AuditLog[] = [
  { id: "al-1", user: "Anita Desai", action: "Updated", module: "Entity Configuration", entity: "ACME India Pvt Ltd", timestamp: "2 min ago", ip: "192.168.1.42", details: "Updated bankFileFormat from HDFC Format → ICICI Format" },
  { id: "al-2", user: "Rajesh Kumar", action: "Approved", module: "Payroll Run", entity: "ACME UAE LLC", timestamp: "1 hour ago", ip: "192.168.1.51", details: "Approved payroll run PR-2024-11 for November 2024" },
  { id: "al-3", user: "Fatima Hassan", action: "Created", module: "Salary Structure", entity: "ACME US Inc", timestamp: "3 hours ago", ip: "192.168.1.55", details: "Created new structure US Tech Structure v1" },
  { id: "al-4", user: "Vikram Singh", action: "Deleted", module: "Component", entity: "ACME India Pvt Ltd", timestamp: "5 hours ago", ip: "192.168.1.60", details: "Deleted component Special Allowance Bonus" },
  { id: "al-5", user: "Anita Desai", action: "Published", module: "Payslip", entity: "ACME India Pvt Ltd", timestamp: "1 day ago", ip: "192.168.1.42", details: "Published 142 payslips for October 2024" },
  { id: "al-6", user: "Payroll Admin", action: "Generated", module: "Bank File", entity: "ACME India Pvt Ltd", timestamp: "1 day ago", ip: "192.168.1.70", details: "Generated HDFC bank file for 138 employees" },
  { id: "al-7", user: "Rajesh Kumar", action: "Filed", module: "Compliance", entity: "ACME India Pvt Ltd", timestamp: "2 days ago", ip: "192.168.1.51", details: "Filed PF challan CH-PF-2024-10 for ₹4,28,400" },
  { id: "al-8", user: "Anita Desai", action: "Rejected", module: "Salary Revision", entity: "ACME US Inc", timestamp: "2 days ago", ip: "192.168.1.42", details: "Rejected revision SR-0042 — exceeds budget cap" },
]

const ROLES = ["Payroll Admin", "HR Head", "Finance Manager", "Manager", "Employee"]
const MODULES = ["Salary", "Compliance", "Arrear", "FnF", "Settings"]
const PERMISSIONS: Record<string, Record<string, "Full" | "View" | "None">> = {
  "Payroll Admin": { Salary: "Full", Compliance: "Full", Arrear: "Full", FnF: "Full", Settings: "Full" },
  "HR Head": { Salary: "Full", Compliance: "View", Arrear: "View", FnF: "Full", Settings: "View" },
  "Finance Manager": { Salary: "Full", Compliance: "Full", Arrear: "View", FnF: "Full", Settings: "View" },
  "Manager": { Salary: "View", Compliance: "None", Arrear: "None", FnF: "View", Settings: "None" },
  "Employee": { Salary: "View", Compliance: "None", Arrear: "None", FnF: "None", Settings: "None" },
}

export function AuditSecuritySettingsSection() {
  const [search, setSearch] = useState("")
  const [filterModule, setFilterModule] = useState("All")
  const [filterAction, setFilterAction] = useState("All")
  const [twoFA, setTwoFA] = useState(true)
  const [ipWhitelist, setIpWhitelist] = useState("192.168.1.0/24, 10.0.0.0/16")
  const [sessionTimeout, setSessionTimeout] = useState("30 minutes")
  const [dataMasking, setDataMasking] = useState(true)
  const [payslipRetention, setPayslipRetention] = useState("7 years (India)")
  const [auditRetention, setAuditRetention] = useState("10 years")

  const filtered = useMemo(() => {
    return AUDIT_LOGS.filter((l) => {
      if (search) {
        const q = search.toLowerCase()
        if (!l.user.toLowerCase().includes(q) && !l.action.toLowerCase().includes(q) && !l.module.toLowerCase().includes(q) && !l.entity.toLowerCase().includes(q)) return false
      }
      if (filterModule !== "All" && l.module !== filterModule) return false
      if (filterAction !== "All" && l.action !== filterAction) return false
      return true
    })
  }, [search, filterModule, filterAction])

  const moduleOptions = ["All", ...Array.from(new Set(AUDIT_LOGS.map((l) => l.module)))]
  const actionOptions = ["All", ...Array.from(new Set(AUDIT_LOGS.map((l) => l.action)))]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Audit & Security</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Audit trail, security controls, access matrix and retention.</p>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          {/* Filter bar */}
          <div className="p-4 border-b border-border/60 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
              <Badge variant="outline" className="text-xs">{filtered.length} of {AUDIT_LOGS.length}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-[200px]" />
              </div>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{moduleOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{actionOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              {(search || filterModule !== "All" || filterAction !== "All") && (
                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => { setSearch(""); setFilterModule("All"); setFilterAction("All") }}>
                  <Filter className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="max-h-[440px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent border-border/60">
                  {["User", "Action", "Module", "Entity", "Timestamp", "IP Address", "Details"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{l.user}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{l.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{l.module}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{l.entity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.timestamp}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground/70">{l.ip}</TableCell>
                    <TableCell className="text-xs text-foreground/90">{l.details}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                      No audit log entries match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Security settings */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Security Settings</h3>
            </div>
            <Separator />
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-foreground">2FA for Payroll Approval</div>
                <div className="text-xs text-muted-foreground mt-0.5">Require two-factor auth for payroll approval actions.</div>
              </div>
              <Switch checked={twoFA} onCheckedChange={setTwoFA} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">IP Whitelist (comma-separated CIDRs)</Label>
              <Input value={ipWhitelist} onChange={(e) => setIpWhitelist(e.target.value)} className="h-9 font-mono text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Session Timeout</Label>
              <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["15 minutes", "30 minutes", "1 hour", "4 hours"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-foreground">Sensitive Data Masking</div>
                <div className="text-xs text-muted-foreground mt-0.5">Mask PAN, bank account, salary in non-privileged views.</div>
              </div>
              <Switch checked={dataMasking} onCheckedChange={setDataMasking} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
          </CardContent>
        </Card>

        {/* Data retention */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Data Retention Policy</h3>
            </div>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Payslip Retention</Label>
              <Select value={payslipRetention} onValueChange={setPayslipRetention}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["7 years (India)", "5 years (UAE)", "7 years (US)", "5 years (Singapore)"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Statutory minimum retention for payslips.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Audit Log Retention</Label>
              <Select value={auditRetention} onValueChange={setAuditRetention}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["5 years", "7 years", "10 years", "Indefinite"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white self-start mt-2" onClick={() => toast.success("Security & retention settings saved")}>
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Access control matrix */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Access Control Matrix</h3>
              <p className="text-xs text-muted-foreground">Role × Module permissions grid.</p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Role</TableHead>
                  {MODULES.map((m) => (
                    <TableHead key={m} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-center">{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLES.map((role) => (
                  <TableRow key={role} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5">
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{role}</TableCell>
                    {MODULES.map((m) => {
                      const perm = PERMISSIONS[role][m]
                      return (
                        <TableCell key={m} className="text-center">
                          {perm === "Full" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 gap-1">
                              <Check className="h-3 w-3" /> Full
                            </Badge>
                          ) : perm === "View" ? (
                            <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-0 gap-1">
                              <Eye className="h-3 w-3" /> View
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400 border-0 gap-1">
                              <X className="h-3 w-3" /> None
                            </Badge>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditSecuritySettingsSection
