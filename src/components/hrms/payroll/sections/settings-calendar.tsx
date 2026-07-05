"use client"

// =============================================================
// Payroll → Settings → Payroll Calendar Settings
// Monthly grid visualisation with pay dates, cut-offs, locks.
// Calendar config + holiday integration + next 12 pay dates.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  CalendarDays, Save, Lock, CalendarCheck, CalendarX, CalendarClock,
  ChevronLeft, ChevronRight, Sparkles,
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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface CalendarConfig {
  defaultPayDate: string
  attendanceCutOff: string
  leaveCutOff: string
  reimbursementCutOff: string
  payrollLockDate: string
  holidayIntegration: boolean
}

const INITIAL: CalendarConfig = {
  defaultPayDate: "Last Working Day",
  attendanceCutOff: "25th",
  leaveCutOff: "25th",
  reimbursementCutOff: "20th",
  payrollLockDate: "Last Day",
  holidayIntegration: true,
}

export function CalendarSettingsSection() {
  const [view, setView] = useState(new Date())
  const [config, setConfig] = useState<CalendarConfig>(INITIAL)

  const year = view.getFullYear()
  const month = view.getMonth()
  const today = new Date()

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Compute special days
  function isPayDate(day: number | null): boolean {
    if (!day) return false
    return day === daysInMonth || day === 28
  }
  function isCutOff(day: number | null): boolean {
    if (!day) return false
    return day === 25 || day === 20
  }
  function isLockDate(day: number | null): boolean {
    if (!day) return false
    return day === daysInMonth
  }

  // Next 12 pay dates — simple monthly schedule
  const nextPayDates: Date[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i + 1, 0)
    return d
  })

  function set<K extends keyof CalendarConfig>(k: K, v: CalendarConfig[K]) {
    setConfig((p) => ({ ...p, [k]: v }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Payroll Calendar Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Visualise pay dates, cut-offs and locks; configure default cadence.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-border/60 shadow-soft">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(new Date(year, month - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-base font-semibold text-foreground min-w-[180px] text-center">
                    {MONTHS[month]} {year}
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(new Date(year, month + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setView(new Date())}>
                  <CalendarCheck className="h-3.5 w-3.5" /> Today
                </Button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-teal-500" /> Pay Date</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500" /> Cut-Off</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500" /> Lock Date</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-cyan-500" /> Holiday</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-600" /> Weekend</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1.5 font-semibold text-muted-foreground uppercase tracking-wide">{w}</div>
                ))}
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />
                  const weekday = (firstDay + idx) % 7
                  const isWeekend = weekday === 0 || weekday === 6
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
                  const isPay = isPayDate(day)
                  const isCut = isCutOff(day)
                  const isLock = isLockDate(day)
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "relative aspect-square rounded-md border flex flex-col items-center justify-center text-xs transition-all",
                        isWeekend && "bg-slate-100 dark:bg-slate-800/60 border-border/40",
                        !isWeekend && "bg-background border-border/60",
                        isToday && "ring-2 ring-teal-500 ring-offset-1 ring-offset-background",
                        isPay && "bg-teal-500 text-white border-teal-500 font-semibold",
                        isCut && !isPay && "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300/60",
                        isLock && !isPay && "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border-rose-300/60",
                      )}
                    >
                      <span>{day}</span>
                      {isPay && <Lock className="absolute top-0.5 right-0.5 h-2.5 w-2.5 opacity-80" />}
                      {isCut && !isPay && <CalendarClock className="absolute top-0.5 right-0.5 h-2.5 w-2.5 opacity-80" />}
                      {isLock && !isPay && <CalendarX className="absolute top-0.5 right-0.5 h-2.5 w-2.5 opacity-80" />}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-4">
          <Card className="rounded-xl border-border/60 shadow-soft">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Calendar Defaults</h3>
              </div>
              <Separator />
              <FormField label="Default Pay Date">
                <Select value={config.defaultPayDate} onValueChange={(v) => set("defaultPayDate", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Last Working Day", "Last Day", "1st", "5th", "7th", "10th", "15th", "25th", "28th"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Attendance Cut-Off">
                <Select value={config.attendanceCutOff} onValueChange={(v) => set("attendanceCutOff", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Last Day", "25th", "20th", "15th", "Pay Period End", "Pay Date - 2 days"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Leave Cut-Off">
                <Select value={config.leaveCutOff} onValueChange={(v) => set("leaveCutOff", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Last Day", "25th", "20th", "15th", "Pay Period End", "Pay Date - 2 days"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Reimbursement Cut-Off">
                <Select value={config.reimbursementCutOff} onValueChange={(v) => set("reimbursementCutOff", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Last Day", "25th", "20th", "15th", "Pay Period End"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Payroll Lock Date Rule">
                <Select value={config.payrollLockDate} onValueChange={(v) => set("payrollLockDate", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Last Day", "Pay Date - 1", "Pay Date - 2", "On Approval"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-foreground">Holiday Calendar Integration</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Mark public holidays on the payroll calendar.</div>
                </div>
                <Switch checked={config.holidayIntegration} onCheckedChange={(v) => set("holidayIntegration", v)} className="mt-0.5 data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
              </label>
              <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white mt-1" onClick={() => toast.success("Calendar settings saved")}>
                <Save className="h-4 w-4" /> Save Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Next 12 pay dates */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-foreground">Next 12 Pay Dates</h3>
          </div>
          <ScrollArea className="max-h-[260px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {nextPayDates.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex-col">
                    <span className="text-[10px] uppercase font-semibold leading-none">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                    <span className="text-base font-bold leading-none mt-0.5">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Cycle {i + 1}</div>
                    <div className="text-sm font-medium text-foreground truncate">{d.toLocaleDateString("en-IN", { weekday: "long" })}</div>
                  </div>
                  {i === 0 && <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-0 ml-auto text-[10px]">Next</Badge>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}

export default CalendarSettingsSection
