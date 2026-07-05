"use client"

// ============================================================================
//  AssetRecoverySection — Offboarding spec #11
//  Track company asset returns, damage, loss, recovery amounts, and FnF push.
//  Stats cards, filter bar, asset recovery table with row actions, asset
//  summary cards grouped per exit case (employee).
// ============================================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Package, Clock, CheckCircle2, AlertTriangle, Search, MoreHorizontal,
  Laptop, Monitor, Smartphone, IdCard, KeyRound, HardDrive, Tablet,
  Shirt, Car, Wrench, FileCheck, Ban, IndianRupee, BellRing, FileText,
  PackageCheck, PackageX, Filter, Inbox, AlertCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

import {
  EXIT_CASES, ASSET_RECOVERY,
} from "@/components/hrms/offboarding/data"
import type { AssetRecoveryItem } from "@/components/hrms/offboarding/shared"
import {
  initials, formatDate, formatCurrency, STATUS_COLORS, AVATAR_COLORS,
} from "@/components/hrms/offboarding/shared"

// ---------- Constants ----------
const ASSET_TYPES = [
  "Laptop", "Desktop", "Monitor", "Mobile", "ID Card", "Access Card",
  "Keyboard", "Mouse", "SIM Card", "Uniform", "Vehicle", "Tools",
  "Software License", "Company Documents", "Accommodation Items", "Office Keys",
] as const

const RETURN_STATUSES = ["Pending", "Returned", "Damaged", "Lost", "Waived"] as const

const ASSET_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Laptop: Laptop, Desktop: HardDrive, Monitor: Monitor, Mobile: Smartphone,
  "ID Card": IdCard, "Access Card": KeyRound, Keyboard: HardDrive, Mouse: HardDrive,
  "SIM Card": KeyRound, Uniform: Shirt, Vehicle: Car, Tools: Wrench,
  "Software License": FileCheck, "Company Documents": FileText,
  "Accommodation Items": Package, "Office Keys": KeyRound, Tablet: Tablet,
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  Laptop: "#8b5cf6", Desktop: "#0ea5e9", Monitor: "#06b6d4", Mobile: "#10b981",
  "ID Card": "#f59e0b", "Access Card": "#f97316", Keyboard: "#6366f1", Mouse: "#6366f1",
  "SIM Card": "#14b8a6", Uniform: "#ec4899", Vehicle: "#ef4444", Tools: "#a855f7",
  "Software License": "#84cc16", "Company Documents": "#f43f5e",
  "Accommodation Items": "#fbbf24", "Office Keys": "#a3e635", Tablet: "#0ea5e9",
}

// ============================================================================
//  Component
// ============================================================================
export function AssetRecoverySection() {
  const [assets, setAssets] = useState<AssetRecoveryItem[]>(ASSET_RECOVERY)
  const [exitCaseFilter, setExitCaseFilter] = useState<string>("all")
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all")
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  // ---------- Derived: filter + search ----------
  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (exitCaseFilter !== "all" && a.exitCaseId !== exitCaseFilter) return false
      if (assetTypeFilter !== "all" && a.assetType !== assetTypeFilter) return false
      if (returnStatusFilter !== "all" && a.returnStatus !== returnStatusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(
          a.assetCode.toLowerCase().includes(q) ||
          a.assetType.toLowerCase().includes(q) ||
          (a.serialNumber?.toLowerCase().includes(q) ?? false)
        )) return false
      }
      return true
    })
  }, [assets, exitCaseFilter, assetTypeFilter, returnStatusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = assets.length
    const pending = assets.filter((a) => a.returnStatus === "Pending").length
    const returned = assets.filter((a) => a.returnStatus === "Returned").length
    const damagedLost = assets.filter((a) => a.returnStatus === "Damaged" || a.returnStatus === "Lost").length
    return { total, pending, returned, damagedLost }
  }, [assets])

  // ---------- Summary by exit case ----------
  const exitCaseSummary = useMemo(() => {
    return EXIT_CASES.map((ec) => {
      const ecAssets = assets.filter((a) => a.exitCaseId === ec.id)
      if (ecAssets.length === 0) return null
      const pending = ecAssets.filter((a) => a.returnStatus === "Pending").length
      const returned = ecAssets.filter((a) => a.returnStatus === "Returned").length
      const damagedLost = ecAssets.filter((a) => a.returnStatus === "Damaged" || a.returnStatus === "Lost").length
      const recoveryTotal = ecAssets.reduce((s, a) => s + (a.recoveryAmount || 0), 0)
      const fnfPushed = ecAssets.filter((a) => a.pushToFnf).length
      return { ec, total: ecAssets.length, pending, returned, damagedLost, recoveryTotal, fnfPushed }
    }).filter(Boolean) as {
      ec: typeof EXIT_CASES[number]; total: number; pending: number; returned: number;
      damagedLost: number; recoveryTotal: number; fnfPushed: number
    }[]
  }, [assets])

  // ---------- Actions ----------
  const updateAsset = (id: string, patch: Partial<AssetRecoveryItem>) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const handleAction = (action: string, asset: AssetRecoveryItem) => {
    const ec = EXIT_CASES.find((e) => e.id === asset.exitCaseId)
    const ecLabel = ec ? `${ec.employeeName} (${ec.exitCaseId})` : asset.exitCaseId
    const patch: Partial<AssetRecoveryItem> = {}
    switch (action) {
      case "returned":
        patch.returnStatus = "Returned"
        patch.actualReturnDate = new Date().toISOString()
        patch.conditionAtReturn = "Good"
        patch.damage = false; patch.lost = false
        break
      case "damaged":
        patch.returnStatus = "Damaged"
        patch.damage = true; patch.lost = false
        patch.actualReturnDate = new Date().toISOString()
        patch.conditionAtReturn = "Damaged"
        break
      case "lost":
        patch.returnStatus = "Lost"
        patch.lost = true; patch.damage = false
        break
      case "waive":
        patch.returnStatus = "Waived"
        patch.waiverApproved = true
        break
      case "pushfnf":
        patch.pushToFnf = true
        break
      default:
        break
    }
    if (Object.keys(patch).length > 0) updateAsset(asset.id, patch)
    const labels: Record<string, string> = {
      returned: "Marked as returned", damaged: "Marked as damaged", lost: "Marked as lost",
      waive: "Recovery waived", recovery: "Recovery amount dialog opened",
      reminder: `Reminder sent to ${ec?.employeeName || "employee"}`,
      nodues: "Asset No-Dues certificate generated", pushfnf: "Pushed to FnF settlement",
    }
    toast.success(`${labels[action] || action} — ${asset.assetCode}`, {
      description: `Exit case: ${ecLabel}`,
    })
  }

  // ---------- Render helpers ----------
  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || "#94a3b8"
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {status}
      </span>
    )
  }

  const renderAssetIcon = (type: string) => {
    const Icon = ASSET_TYPE_ICON[type] || Package
    const color = ASSET_TYPE_COLORS[type] || "#94a3b8"
    return (
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>
    )
  }

  // ============================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Total Assets"
          value={stats.total}
          accent="#9f1239"
          tint="#fff1f2"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending Return"
          value={stats.pending}
          accent="#f59e0b"
          tint="#fffbeb"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Returned"
          value={stats.returned}
          accent="#10b981"
          tint="#ecfdf5"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Damaged / Lost"
          value={stats.damagedLost}
          accent="#ef4444"
          tint="#fef2f2"
        />
      </div>

      {/* Filter bar */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by asset code, serial number…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              <Select value={exitCaseFilter} onValueChange={setExitCaseFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[180px]"><SelectValue placeholder="Exit Case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exit Cases</SelectItem>
                  {EXIT_CASES.map((ec) => (
                    <SelectItem key={ec.id} value={ec.id}>{ec.employeeName} · {ec.exitCaseId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Asset Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Asset Types</SelectItem>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={returnStatusFilter} onValueChange={setReturnStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Return Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {RETURN_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(exitCaseFilter !== "all" || assetTypeFilter !== "all" || returnStatusFilter !== "all" || search) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {assets.length} assets</span>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-xs"
                onClick={() => { setExitCaseFilter("all"); setAssetTypeFilter("all"); setReturnStatusFilter("all"); setSearch("") }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset recovery table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-rose-600" />
            Asset Recovery
            <Badge variant="secondary" className="ml-1 font-normal">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-[220px]">Asset</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Exit Case</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Actual Return</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Damage / Lost</TableHead>
                  <TableHead>Recovery</TableHead>
                  <TableHead className="text-center">FnF</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No assets match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((asset) => {
                    const ec = EXIT_CASES.find((e) => e.id === asset.exitCaseId)
                    return (
                      <TableRow
                        key={asset.id}
                        className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {renderAssetIcon(asset.assetType)}
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{asset.assetCode}</div>
                              <div className="text-xs text-muted-foreground">{asset.assetType}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {asset.serialNumber || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {ec ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white shrink-0"
                                style={{ backgroundColor: ec.avatarColor }}
                              >
                                {initials(ec.employeeName)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">{ec.employeeName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{ec.exitCaseId}</div>
                              </div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(asset.assignedDate)}</TableCell>
                        <TableCell className="text-xs">{formatDate(asset.expectedReturnDate)}</TableCell>
                        <TableCell className="text-xs">{formatDate(asset.actualReturnDate)}</TableCell>
                        <TableCell>{renderStatusBadge(asset.returnStatus)}</TableCell>
                        <TableCell className="text-xs">
                          {asset.conditionAtReturn || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {asset.damage && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-300 text-rose-700 dark:text-rose-300">
                                Damage {asset.damageAmount ? formatCurrency(asset.damageAmount) : ""}
                              </Badge>
                            )}
                            {asset.lost && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-red-300 text-red-700 dark:text-red-300">
                                Lost
                              </Badge>
                            )}
                            {!asset.damage && !asset.lost && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {asset.recoveryAmount && asset.recoveryAmount > 0 ? (
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                              {formatCurrency(asset.recoveryAmount)}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {asset.pushToFnf ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-300">
                              Pushed
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-xs">Asset Actions</DropdownMenuLabel>
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleAction("returned", asset)}>
                                  <PackageCheck className="h-3.5 w-3.5 mr-2" /> Mark Returned
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("damaged", asset)}>
                                  <AlertCircle className="h-3.5 w-3.5 mr-2" /> Mark Damaged
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("lost", asset)}>
                                  <PackageX className="h-3.5 w-3.5 mr-2" /> Mark Lost
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleAction("recovery", asset)}>
                                  <IndianRupee className="h-3.5 w-3.5 mr-2" /> Add Recovery Amount
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("waive", asset)}>
                                  <Ban className="h-3.5 w-3.5 mr-2" /> Waive Recovery
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("reminder", asset)}>
                                  <BellRing className="h-3.5 w-3.5 mr-2" /> Send Reminder
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleAction("nodues", asset)}>
                                  <FileCheck className="h-3.5 w-3.5 mr-2" /> Generate No-Dues
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("pushfnf", asset)}>
                                  <IndianRupee className="h-3.5 w-3.5 mr-2" /> Push to FnF
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Asset summary by exit case */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-4 w-4 text-rose-600" />
            Asset Summary by Exit Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exitCaseSummary.length === 0 ? (
              <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
                No asset records found for any exit case.
              </div>
            ) : (
              exitCaseSummary.map((s, idx) => (
                <motion.div
                  key={s.ec.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className="rounded-xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/40 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white text-xs font-semibold"
                      style={{ backgroundColor: s.ec.avatarColor }}
                    >
                      {initials(s.ec.employeeName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{s.ec.employeeName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {s.ec.exitCaseId} · {s.ec.department}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{s.total} asset{s.total !== 1 ? "s" : ""}</Badge>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 py-1.5">
                      <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{s.pending}</div>
                      <div className="text-[10px] text-muted-foreground">Pending</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 py-1.5">
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{s.returned}</div>
                      <div className="text-[10px] text-muted-foreground">Returned</div>
                    </div>
                    <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 py-1.5">
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{s.damagedLost}</div>
                      <div className="text-[10px] text-muted-foreground">Dmg/Lost</div>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Recovery Total</div>
                      <div className="font-semibold text-rose-600 dark:text-rose-400">
                        {s.recoveryTotal > 0 ? formatCurrency(s.recoveryTotal) : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pushed to FnF</div>
                      <div className="font-semibold">{s.fnfPushed} / {s.total}</div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
//  Sub-components
// ============================================================================
function StatCard({ icon, label, value, accent, tint }: {
  icon: React.ReactNode; label: string; value: number; accent: string; tint: string
}) {
  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <div
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ backgroundColor: tint, color: accent }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AssetRecoverySection
