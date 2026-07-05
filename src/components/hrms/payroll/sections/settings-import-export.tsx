"use client"

// =============================================================
// Payroll → Settings → Import / Export Settings
// Import templates + Export templates + History table +
// Settings.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Upload, Download, Save, FileSpreadsheet, FileText, CheckCircle2,
  XCircle, Clock,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

const IMPORT_TEMPLATES = [
  { id: "emp-sal", name: "Employee Salary", format: "Excel", description: "Bulk upload employee salary profiles." },
  { id: "pay-input", name: "Payroll Inputs", format: "CSV", description: "Bulk upload payroll inputs (attendance, OT, etc.)." },
  { id: "sal-struct", name: "Salary Structure", format: "Excel", description: "Bulk upload salary structures and components." },
  { id: "components", name: "Components", format: "CSV", description: "Bulk upload salary components." },
  { id: "inv-decl", name: "Investment Declaration", format: "Excel", description: "Bulk upload employee investment declarations." },
]

const EXPORT_TEMPLATES = [
  { id: "payslips", name: "Payslips", format: "PDF", description: "Export payslips in bulk for a payroll run." },
  { id: "register", name: "Payroll Register", format: "Excel", description: "Export payroll register for an entity / month." },
  { id: "bank-file", name: "Bank File", format: "CSV", description: "Export bank disbursement file." },
  { id: "return", name: "Compliance Return", format: "Excel", description: "Export PF / ESI / PT / TDS returns." },
  { id: "form16", name: "Form 16", format: "PDF", description: "Export Form 16 in bulk for an entity / FY." },
]

interface HistoryRow {
  id: string
  type: "Import" | "Export"
  template: string
  user: string
  records: number
  status: "Success" | "Failed" | "Partial"
  timestamp: string
}

const HISTORY: HistoryRow[] = [
  { id: "h-1", type: "Import", template: "Employee Salary", user: "Anita Desai", records: 142, status: "Success", timestamp: "2 hours ago" },
  { id: "h-2", type: "Export", template: "Payroll Register", user: "Rajesh Kumar", records: 142, status: "Success", timestamp: "5 hours ago" },
  { id: "h-3", type: "Export", template: "Bank File", user: "Payroll Admin", records: 138, status: "Success", timestamp: "1 day ago" },
  { id: "h-4", type: "Import", template: "Investment Declaration", user: "Fatima Hassan", records: 87, status: "Partial", timestamp: "2 days ago" },
  { id: "h-5", type: "Export", template: "Form 16", user: "Anita Desai", records: 96, status: "Success", timestamp: "3 days ago" },
  { id: "h-6", type: "Import", template: "Payroll Inputs", user: "Vikram Singh", records: 12, status: "Failed", timestamp: "4 days ago" },
]

export function ImportExportSettingsSection() {
  const [autoValidate, setAutoValidate] = useState(true)
  const [skipErrors, setSkipErrors] = useState("10")
  const [exportFormat, setExportFormat] = useState("Excel")

  function downloadTemplate(name: string) {
    toast.success(`Template "${name}" downloaded`, { description: "Sample file saved to downloads." })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Import / Export Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Templates, history and validation rules for bulk payroll operations.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Import templates */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                <Upload className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Import Templates</h3>
            </div>
            <div className="flex flex-col gap-2">
              {IMPORT_TEMPLATES.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{t.format}</Badge>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs hover:bg-slate-500/10" onClick={() => downloadTemplate(t.name)}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export templates */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
                <Download className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Export Templates</h3>
            </div>
            <div className="flex flex-col gap-2">
              {EXPORT_TEMPLATES.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{t.format}</Badge>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs hover:bg-slate-500/10" onClick={() => downloadTemplate(t.name)}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-foreground">Import / Export History</h3>
          </div>
          <ScrollArea className="max-h-[400px] rounded-lg border border-border/60">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent">
                  {["Type", "Template", "User", "Records", "Status", "Timestamp"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {HISTORY.map((row) => (
                  <TableRow key={row.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5">
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] gap-1", row.type === "Import" ? "text-emerald-700 dark:text-emerald-300" : "text-cyan-700 dark:text-cyan-300")}>
                        {row.type === "Import" ? <Upload className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{row.template}</TableCell>
                    <TableCell className="text-xs text-foreground/90">{row.user}</TableCell>
                    <TableCell className="text-xs tabular-nums">{row.records.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      {row.status === "Success" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </Badge>
                      ) : row.status === "Failed" ? (
                        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0 gap-1">
                          <XCircle className="h-3 w-3" /> Failed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 gap-1">
                          <Clock className="h-3 w-3" /> Partial
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Import / Export Defaults</h3>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer sm:col-span-1">
              <div>
                <div className="text-sm font-medium text-foreground">Auto-validate on Import</div>
                <div className="text-xs text-muted-foreground mt-0.5">Validate rows before applying.</div>
              </div>
              <Switch checked={autoValidate} onCheckedChange={setAutoValidate} className="mt-0.5 data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Skip Errors Threshold</Label>
              <Select value={skipErrors} onValueChange={setSkipErrors}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["0", "5", "10", "25", "50"].map((o) => <SelectItem key={o} value={o}>{o} errors</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Abort import if errors exceed this count.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Default Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["CSV", "Excel", "PDF"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white self-start mt-2" onClick={() => toast.success("Import / export settings saved")}>
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ImportExportSettingsSection
