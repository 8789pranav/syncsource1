"use client"

// ============================================================================
//  Salary — Pay Groups (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Manage pay groups: stats row, table, add dialog, detail drawer.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Users, Plus, Search, Filter, MoreHorizontal, Eye, Pencil, Trash2,
  Building2, RefreshCw, CheckCircle2, Layers, CalendarDays, Banknote,
  Star, ChevronRight, Tag,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"

import {
  PayGroup, STATUS_COLORS, formatDate, formatNumber, CURRENCIES, PAYROLL_FREQUENCIES,
} from "../shared"
import { PAY_GROUPS, PAYROLL_RUNS, SALARY_STRUCTURES } from "../data"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "teal" | "cyan" | "emerald" | "amber"; sub?: string
}) {
  const map: Record<string, string> = {
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  }
  return (
    <Card className={cn("rounded-xl border border-border/60 shadow-soft bg-gradient-to-br", map[accent])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", map[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Add Pay Group dialog
// ============================================================================
function AddPayGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = React.useState({
    name: "", code: "", description: "", entity: "", frequency: "Monthly",
    payrollMonthStartDay: "1", payrollMonthEndDay: "31",
    payDate: "Last Working Day", currency: "INR",
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.name || !form.code || !form.entity) {
      toast.error("Please fill all required fields")
      return
    }
    toast.success("Pay group created", { description: `${form.name} (${form.code})` })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Add Pay Group
          </DialogTitle>
          <DialogDescription>Create a new pay group with calendar & currency.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="India Monthly Payroll" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Code *</Label>
              <Input value={form.code} onChange={e => set("code", e.target.value)} placeholder="IND_MON" className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className="bg-background resize-none" placeholder="Brief description..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entity *</Label>
              <Select value={form.entity} onValueChange={v => set("entity", v)}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select entity" /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(PAY_GROUPS.map(g => g.entity))).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frequency</Label>
              <Select value={form.frequency} onValueChange={v => set("frequency", v)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYROLL_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payroll Month Start Day</Label>
              <Input type="number" value={form.payrollMonthStartDay} onChange={e => set("payrollMonthStartDay", e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payroll Month End Day</Label>
              <Input type="number" value={form.payrollMonthEndDay} onChange={e => set("payrollMonthEndDay", e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pay Date</Label>
              <Input value={form.payDate} onChange={e => set("payDate", e.target.value)} placeholder="Last Working Day / 28th" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Create Pay Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Detail drawer
// ============================================================================
function PayGroupDrawer({ group, onClose }: { group: PayGroup | null; onClose: () => void }) {
  const [tab, setTab] = React.useState("overview")
  if (!group) return null
  const linkedRuns = PAYROLL_RUNS.filter(r => r.payGroupId === group.id)
  const linkedStructures = SALARY_STRUCTURES.filter(s => s.entity === group.entity)

  return (
    <Sheet open={!!group} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3 border-b border-border/60 bg-gradient-to-br from-teal-50/60 to-cyan-50/40 dark:from-teal-500/5 dark:to-cyan-500/5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg truncate">{group.name}</SheetTitle>
              <SheetDescription className="text-xs">
                <span className="font-mono">{group.code}</span> · {group.entity}
              </SheetDescription>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {group.isDefault && <Badge variant="secondary" className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 gap-1"><Star className="h-3 w-3" /> Default</Badge>}
                <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[group.status])}>{group.status}</Badge>
                <Badge variant="outline" className="text-[10px]">{group.frequency}</Badge>
                <Badge variant="outline" className="text-[10px]">{group.currency}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pt-3 border-b border-border/40">
            <TabsList>
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="runs" className="text-xs">Payroll Runs ({linkedRuns.length})</TabsTrigger>
              <TabsTrigger value="structures" className="text-xs">Structures ({linkedStructures.length})</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Employees", value: formatNumber(group.employeeCount), icon: Users },
                    { label: "Frequency", value: group.frequency, icon: RefreshCw },
                    { label: "Payroll Month", value: group.payrollMonth, icon: CalendarDays },
                    { label: "Pay Date", value: group.payDate, icon: CalendarDays },
                    { label: "Currency", value: group.currency, icon: Banknote },
                    { label: "Created", value: formatDate(group.createdAt), icon: CalendarDays },
                  ].map(d => (
                    <div key={d.label} className="rounded-lg border border-border/60 bg-background p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <d.icon className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{d.label}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{d.value}</p>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
                  <p className="text-sm text-foreground">{group.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="runs" className="mt-0 space-y-2">
                {linkedRuns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No linked payroll runs.</p>
                ) : linkedRuns.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.payrollMonth} · {r.totalEmployees} emp</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[r.status])}>{r.status}</Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="structures" className="mt-0 space-y-2">
                {linkedStructures.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No linked salary structures.</p>
                ) : linkedStructures.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.employeeType} · v{s.version}</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[s.status])}>{s.status}</Badge>
                  </div>
                ))}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <Separator />
        <div className="p-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Edit dialog opened")} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          <Button size="sm" onClick={onClose} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function PayGroupsSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", status: "all" })
  const [addOpen, setAddOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<PayGroup | null>(null)

  const entities = Array.from(new Set(PAY_GROUPS.map(g => g.entity)))

  const filtered = React.useMemo(() => {
    let list = PAY_GROUPS
    if (filters.entity !== "all") list = list.filter(g => g.entity === filters.entity)
    if (filters.status !== "all") list = list.filter(g => g.status === filters.status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q) || g.entity.toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const stats = {
    total: PAY_GROUPS.length,
    active: PAY_GROUPS.filter(g => g.status === "Active").length,
    default: PAY_GROUPS.filter(g => g.isDefault).length,
    employees: PAY_GROUPS.reduce((s, g) => s + g.employeeCount, 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Pay Groups</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define payroll cycles, calendars & currencies for each entity.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Add Pay Group
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Pay Groups" value={stats.total} icon={Users} accent="teal" sub="Across all entities" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Active" value={stats.active} icon={CheckCircle2} accent="emerald" sub="Currently running" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Default" value={stats.default} icon={Star} accent="amber" sub="Per entity" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Total Employees" value={formatNumber(stats.employees)} icon={Users} accent="cyan" sub="On payroll" /></motion.div>
      </motion.div>

      {/* Filter bar */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pay groups..." className="pl-9 h-9 bg-background" />
            </div>
            <Select value={filters.entity} onValueChange={v => setFilters({ ...filters, entity: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[220px]">Name & Code</TableHead>
                <TableHead className="min-w-[160px]">Entity</TableHead>
                <TableHead className="min-w-[110px]">Frequency</TableHead>
                <TableHead className="min-w-[110px]">Payroll Month</TableHead>
                <TableHead className="min-w-[130px]">Pay Date</TableHead>
                <TableHead className="min-w-[80px]">Currency</TableHead>
                <TableHead className="min-w-[80px] text-right">Employees</TableHead>
                <TableHead className="min-w-[80px]">Default</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No pay groups match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(g => (
                <TableRow key={g.id} className="border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(g)}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{g.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[160px]">{g.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{g.frequency}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{g.payrollMonth}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{g.payDate}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{g.currency}</Badge></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{g.employeeCount}</TableCell>
                  <TableCell>
                    {g.isDefault ? <Badge variant="secondary" className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 gap-1"><Star className="h-3 w-3" /> Yes</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[g.status])}>{g.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setDetail(g)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Edit dialog opened")}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Set as default")}>{g.isDefault ? <Star className="h-3.5 w-3.5 mr-2" /> : <Star className="h-3.5 w-3.5 mr-2" />} Set Default</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => toast.success("Pay group deleted")}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <AddPayGroupDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <PayGroupDrawer group={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

export default PayGroupsSection
