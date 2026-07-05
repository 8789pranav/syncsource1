'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Grid3x3, Download, Pencil, Check, X, Filter,
} from "lucide-react"

import { PageHeader, StatCard, EmptyState, SectionCard } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  MODULES, ACCESS_LEVELS, ACCESS_LEVEL_MAP, ROLE_TYPES, ROLE_TYPE_MAP, RISK_LEVEL_MAP,
} from "@/lib/permissions-constants"

interface MatrixRole { id: string; name: string; code: string; roleType: string; isSystem: boolean }
interface MatrixModule { id: string; label: string; group: string; riskLevel: string }
interface MatrixData {
  modules: MatrixModule[]
  roles: MatrixRole[]
  cells: { roleId: string; module: string; accessLevel: string }[]
}

export function PermissionMatrixSection() {
  const [data, setData] = React.useState<MatrixData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [filterRoleType, setFilterRoleType] = React.useState("")
  const [filterGroup, setFilterGroup] = React.useState("")
  const [editCell, setEditCell] = React.useState<{ roleId: string; module: string; accessLevel: string } | null>(null)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterRoleType && filterRoleType !== "__all__") params.set("roleType", filterRoleType)
      if (filterGroup && filterGroup !== "__all__") params.set("group", filterGroup)
      const r = await fetch(`/api/roles-permissions/matrix?${params}`)
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [filterRoleType, filterGroup])

  React.useEffect(() => { load() }, [load])

  // group modules by group
  const groupedModules = React.useMemo(() => {
    if (!data) return []
    const groups: Record<string, MatrixModule[]> = {}
    for (const m of data.modules) {
      if (!groups[m.group]) groups[m.group] = []
      groups[m.group].push(m)
    }
    return Object.entries(groups)
  }, [data])

  const getCell = (roleId: string, module: string) => data?.cells.find(c => c.roleId === roleId && c.module === module)?.accessLevel || "NoAccess"

  const updateCell = async (roleId: string, module: string, accessLevel: string) => {
    setSaving(true)
    try {
      const r = await fetch("/api/roles-permissions/matrix/cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, module, accessLevel, performedByName: "HR Admin" }),
      })
      if (r.ok) {
        toast.success(`Permission updated: ${ACCESS_LEVEL_MAP[accessLevel]?.label}`)
        setEditCell(null)
        load()
      } else {
        toast.error("Failed to update")
      }
    } finally { setSaving(false) }
  }

  const exportCSV = () => {
    if (!data) return
    const header = ["Module", "Group", "Risk", ...data.roles.map(r => r.name)]
    const rows = data.modules.map(m => [m.label, m.group, m.riskLevel, ...data.roles.map(r => getCell(r.id, m.id))])
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "permission-matrix.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Matrix exported")
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Modules" value={data.modules.length} icon={Grid3x3} accent="amber" sub="In matrix" />
        <StatCard label="Roles" value={data.roles.length} icon={Filter} accent="emerald" sub="Columns" />
        <StatCard label="Total Cells" value={data.modules.length * data.roles.length} icon={Grid3x3} accent="cyan" sub="M × R" />
        <StatCard label="Active Grants" value={data.cells.filter(c => c.accessLevel !== "NoAccess").length} icon={Check} accent="fuchsia" sub="Non-empty cells" />
      </div>

      <PageHeader
        title="Permission Matrix"
        description="Bird's-eye view of every role's access to every module. Click any cell to change access level."
        icon={Grid3x3}
        actions={
          <Button size="sm" variant="outline" className="gap-1.5 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 hover:text-violet-600 transition-all" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={filterRoleType} onValueChange={setFilterRoleType}>
          <SelectTrigger className="h-9 w-[180px] focus-visible:ring-violet-400/40"><SelectValue placeholder="All Role Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Role Types</SelectItem>
            {ROLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="h-9 w-[180px] focus-visible:ring-violet-400/40"><SelectValue placeholder="All Module Groups" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Groups</SelectItem>
            {Array.from(new Set(MODULES.map(m => m.group))).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Matrix */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-30 bg-muted/60 backdrop-blur-sm p-2 text-left font-semibold text-muted-foreground border-r border-border/60 min-w-[180px]">
                  Module
                </th>
                {data.roles.map(r => {
                  const t = ROLE_TYPE_MAP[r.roleType] || ROLE_TYPE_MAP.Custom
                  return (
                    <th key={r.id} className="p-2 font-semibold text-muted-foreground min-w-[90px] border-r border-border/30 last:border-r-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`grid h-6 w-6 place-items-center rounded text-white text-[9px] ${t.color}`}>{r.name[0]}</div>
                        <span className="truncate max-w-[80px]" title={r.name}>{r.name}</span>
                        {r.isSystem && <span className="text-[8px] text-violet-500">SYS</span>}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {groupedModules.map(([group, mods]) => (
                <React.Fragment key={group}>
                  <tr className="bg-gradient-to-r from-violet-50/80 to-fuchsia-50/60 dark:from-violet-500/10 dark:to-fuchsia-500/5 border-y border-violet-200/40 dark:border-violet-500/20">
                    <td colSpan={data.roles.length + 1} className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                      {group}
                    </td>
                  </tr>
                  {mods.map(m => {
                    const rk = RISK_LEVEL_MAP[m.riskLevel]
                    return (
                      <tr key={m.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="sticky left-0 z-10 bg-card backdrop-blur-sm p-2 border-r border-border/60">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${rk?.dot}`} />
                            <div>
                              <p className="font-medium">{m.label}</p>
                              <p className="text-[9px] text-muted-foreground">{m.riskLevel} risk</p>
                            </div>
                          </div>
                        </td>
                        {data.roles.map(r => {
                          const cell = getCell(r.id, m.id)
                          const al = ACCESS_LEVEL_MAP[cell]
                          return (
                            <td key={r.id} className="p-1 text-center border-r border-border/20 last:border-r-0">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className={`group inline-flex items-center justify-center h-7 w-7 rounded-md transition-all hover:scale-110 ${cell === "NoAccess" ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : `${al?.color} text-white`}`}
                                    title={`${m.label} × ${r.name}: ${al?.label}`}
                                  >
                                    <span className="text-[10px] font-bold">{al?.short || "—"}</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="center">
                                  <p className="text-xs font-semibold mb-1.5">{m.label} × {r.name}</p>
                                  <div className="grid grid-cols-2 gap-1">
                                    {ACCESS_LEVELS.map(a => (
                                      <button
                                        key={a.value}
                                        onClick={() => updateCell(r.id, m.id, a.value)}
                                        disabled={saving}
                                        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                                          cell === a.value ? `${a.color} text-white` : "bg-muted hover:bg-muted/70"
                                        }`}
                                      >
                                        {cell === a.value && <Check className="h-3 w-3" />}
                                        {a.label}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-muted/60 backdrop-blur-sm">
              <tr>
                <td className="sticky left-0 z-10 bg-muted/60 p-2 font-semibold border-r border-border/60">Total Modules Accessible</td>
                {data.roles.map(r => {
                  const cnt = data.cells.filter(c => c.roleId === r.id && c.accessLevel !== "NoAccess").length
                  return <td key={r.id} className="p-2 text-center font-semibold text-sm">{cnt}</td>
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <SectionCard title="Legend" description="Access level colors and short codes" className="transition-shadow hover:shadow-md">
        <div className="flex flex-wrap gap-2">
          {ACCESS_LEVELS.map(a => (
            <div key={a.value} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-1.5 transition-colors hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md ${a.color} text-white text-[10px] font-bold`}>{a.short}</span>
              <span className="text-xs font-medium">{a.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
