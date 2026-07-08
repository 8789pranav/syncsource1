"use client"

// ============================================================
// SkillsTab — Skills | Certifications sub-tabs.
//   • Skills: cards + proficiency donut (Recharts)
//   • Certifications: cards with expiry highlighting
// ------------------------------------------------------------
// APIs:
//   /api/employees/[id]/skills (+ /<recordId>)
//   /api/employees/[id]/certifications (+ /<recordId>)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts"
import {
  Plus, Pencil, Trash2, RefreshCw, Loader2, Award, Cpu, ShieldCheck,
  Sparkles, Wrench, Languages, BadgeCheck, ExternalLink, CalendarClock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- types ----------

interface SkillRec {
  id: string
  name: string
  category?: string | null
  proficiency?: string | null
  yearsOfExperience?: number | null
  verifiedByManager?: boolean
  lastUsedDate?: string | Date | null
}

interface CertRec {
  id: string
  name: string
  issuingAuthority?: string | null
  issueDate?: string | Date | null
  expiryDate?: string | Date | null
  certificateId?: string | null
  certificateUrl?: string | null
}

// ---------- helpers ----------

const CATEGORY_META: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  Technical: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", icon: Cpu },
  Soft: { color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400", icon: Sparkles },
  Domain: { color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", icon: ShieldCheck },
  Tool: { color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400", icon: Wrench },
  Language: { color: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400", icon: Languages },
}
function catMeta(c?: string | null) {
  return CATEGORY_META[c || ""] || { color: "bg-muted text-muted-foreground", icon: Award }
}

const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"]
const PROFICIENCY_VALUE: Record<string, number> = { Beginner: 25, Intermediate: 50, Advanced: 75, Expert: 100 }
const PROFICIENCY_COLOR: Record<string, string> = {
  Beginner: "#f59e0b", Intermediate: "#06b6d4", Advanced: "#10b981", Expert: "#d946ef",
}
const CATEGORIES = ["Technical", "Soft", "Domain", "Tool", "Language"]

const DONUT_COLORS = ["#f59e0b", "#06b6d4", "#10b981", "#d946ef"]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-card">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Component
// ============================================================

export default function SkillsTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [skills, setSkills] = React.useState<SkillRec[]>([])
  const [certs, setCerts] = React.useState<CertRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState<string>("skills")
  const [skillDialog, setSkillDialog] = React.useState<{ open: boolean; target: SkillRec | null }>({ open: false, target: null })
  const [certDialog, setCertDialog] = React.useState<{ open: boolean; target: CertRec | null }>({ open: false, target: null })
  const [deleteTarget, setDeleteTarget] = React.useState<{ kind: "skill" | "cert"; rec: any } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, cRes] = await Promise.all([
        apiFetch(`/api/employees/${employeeId}/skills`),
        apiFetch(`/api/employees/${employeeId}/certifications`),
      ])
      const sData = await sRes.json()
      const cData = await cRes.json()
      if (!sRes.ok) throw new Error(sData?.error || "Failed to load skills")
      if (!cRes.ok) throw new Error(cData?.error || "Failed to load certifications")
      setSkills(sData?.items || [])
      setCerts(cData?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load skills/certifications")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const verifiedCount = skills.filter((s) => s.verifiedByManager).length
  const expiringSoon = certs.filter((c) => {
    if (!c.expiryDate) return false
    const days = differenceInDays(new Date(c.expiryDate), new Date())
    return days >= 0 && days <= 60
  }).length
  const expired = certs.filter((c) => c.expiryDate && new Date(c.expiryDate) < new Date()).length

  // Donut data: proficiency distribution
  const donutData = React.useMemo(() => {
    return PROFICIENCY_LEVELS.map((lvl) => ({
      name: lvl,
      value: skills.filter((s) => s.proficiency === lvl).length,
    })).filter((d) => d.value > 0)
  }, [skills])

  async function handleDelete() {
    if (!deleteTarget) return
    const { kind, rec } = deleteTarget
    try {
      const url = kind === "skill"
        ? `/api/employees/${employeeId}/skills/${rec.id}`
        : `/api/employees/${employeeId}/certifications/${rec.id}`
      const res = await apiFetch(url, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success(`${kind === "skill" ? "Skill" : "Certification"} deleted`)
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Skills & Certifications</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Track the employee's skills, proficiency levels, and professional certifications.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Skills" value={skills.length} icon={Cpu} accent="emerald" />
        <StatCard label="Verified" value={verifiedCount} icon={BadgeCheck} accent="cyan" />
        <StatCard label="Certifications" value={certs.length} icon={Award} accent="amber" />
        <StatCard label="Expiring ≤60d" value={expiringSoon} icon={CalendarClock} accent="coral" sub={expired ? `${expired} expired` : undefined} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="skills" className="gap-1.5"><Cpu className="h-3.5 w-3.5" /> Skills</TabsTrigger>
          <TabsTrigger value="certs" className="gap-1.5"><Award className="h-3.5 w-3.5" /> Certifications</TabsTrigger>
        </TabsList>

        {/* SKILLS */}
        <TabsContent value="skills" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{skills.length} skills · click edit to update proficiency</p>
                <Button size="sm" className="gap-1.5" onClick={() => setSkillDialog({ open: true, target: null })}>
                  <Plus className="h-4 w-4" /> Add Skill
                </Button>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              ) : skills.length === 0 ? (
                <EmptyState icon={Cpu} title="No skills added" description="Add technical, soft, domain, tool or language skills."
                  action={<Button size="sm" onClick={() => setSkillDialog({ open: true, target: null })}><Plus className="h-4 w-4 mr-1.5" /> Add Skill</Button>} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {skills.map((s) => {
                    const meta = catMeta(s.category)
                    const Icon = meta.icon
                    const profVal = PROFICIENCY_VALUE[s.proficiency || ""] || 0
                    return (
                      <div key={s.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-soft hover:shadow-card transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{s.name}</p>
                              <Badge variant="secondary" className={cn("font-medium border-0 mt-0.5", meta.color)}>
                                {s.category || "—"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {s.verifiedByManager && (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 gap-0.5">
                                <BadgeCheck className="h-3 w-3" />
                              </Badge>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSkillDialog({ open: true, target: s })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget({ kind: "skill", rec: s })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{s.proficiency || "—"}</span>
                            <span className="text-muted-foreground tabular-nums">{s.yearsOfExperience ? `${s.yearsOfExperience} yrs` : ""}</span>
                          </div>
                          <Progress value={profVal} className="h-1.5" />
                          {s.lastUsedDate && (
                            <p className="text-[11px] text-muted-foreground/70 pt-0.5">Last used: {fmtDate(s.lastUsedDate)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Proficiency donut */}
            <div>
              <SectionCard title="Proficiency Distribution" description="Skills by proficiency level">
                {donutData.length === 0 ? (
                  <EmptyState icon={Sparkles} title="No data" description="Add skills to see distribution." />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                          {donutData.map((d, i) => (
                            <Cell key={i} fill={PROFICIENCY_COLOR[d.name] || DONUT_COLORS[i % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                          formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* CERTIFICATIONS */}
        <TabsContent value="certs" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{certs.length} certifications · expired ones highlighted</p>
            <Button size="sm" className="gap-1.5" onClick={() => setCertDialog({ open: true, target: null })}>
              <Plus className="h-4 w-4" /> Add Certification
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : certs.length === 0 ? (
            <EmptyState icon={Award} title="No certifications" description="Add professional certifications and licenses."
              action={<Button size="sm" onClick={() => setCertDialog({ open: true, target: null })}><Plus className="h-4 w-4 mr-1.5" /> Add Certification</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {certs.map((c) => {
                const expiredFlag = c.expiryDate && new Date(c.expiryDate) < new Date()
                const daysToExpiry = c.expiryDate ? differenceInDays(new Date(c.expiryDate), new Date()) : null
                const expiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 60
                return (
                  <div key={c.id} className={cn(
                    "rounded-xl border bg-card p-4 shadow-soft hover:shadow-card transition-shadow",
                    expiredFlag ? "border-rose-300 dark:border-rose-500/30" : expiringSoon ? "border-amber-300 dark:border-amber-500/30" : "border-border/60"
                  )}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.issuingAuthority || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCertDialog({ open: true, target: c })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget({ kind: "cert", rec: c })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Issued</span>
                        <span className="font-medium">{fmtDate(c.issueDate)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Expiry</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{c.expiryDate ? fmtDate(c.expiryDate) : "No expiry"}</span>
                          {expiredFlag && <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">Expired</Badge>}
                          {expiringSoon && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">≤60d</Badge>}
                        </div>
                      </div>
                      {c.certificateId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cert ID</span>
                          <span className="font-medium font-mono text-[10px]">{c.certificateId}</span>
                        </div>
                      )}
                      {c.certificateUrl && (
                        <a href={c.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline pt-1">
                          <ExternalLink className="h-3 w-3" /> View certificate
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Skill dialog */}
      <SkillDialog
        open={skillDialog.open}
        onOpenChange={(o) => setSkillDialog({ open: o, target: null })}
        employeeId={employeeId}
        existing={skillDialog.target}
        onSaved={load}
      />

      {/* Cert dialog */}
      <CertDialog
        open={certDialog.open}
        onOpenChange={(o) => setCertDialog({ open: o, target: null })}
        employeeId={employeeId}
        existing={certDialog.target}
        onSaved={load}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.kind === "skill" ? "skill" : "certification"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.rec?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Skill Dialog
// ============================================================

function SkillDialog({
  open, onOpenChange, employeeId, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  existing: SkillRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    name: "", category: "Technical", proficiency: "Intermediate",
    yearsOfExperience: "", verifiedByManager: false, lastUsedDate: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          name: existing.name || "",
          category: existing.category || "Technical",
          proficiency: existing.proficiency || "Intermediate",
          yearsOfExperience: existing.yearsOfExperience ? String(existing.yearsOfExperience) : "",
          verifiedByManager: !!existing.verifiedByManager,
          lastUsedDate: existing.lastUsedDate ? format(new Date(existing.lastUsedDate), "yyyy-MM-dd") : "",
        })
      } else {
        setForm({ name: "", category: "Technical", proficiency: "Intermediate", yearsOfExperience: "", verifiedByManager: false, lastUsedDate: "" })
      }
    }
  }, [open, existing])

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Skill name is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        proficiency: form.proficiency,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
        verifiedByManager: !!form.verifiedByManager,
        lastUsedDate: form.lastUsedDate ? new Date(form.lastUsedDate).toISOString() : undefined,
      }
      const url = isEdit ? `/api/employees/${employeeId}/skills/${existing!.id}` : `/api/employees/${employeeId}/skills`
      const method = isEdit ? "PATCH" : "POST"
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save skill")
      toast.success(isEdit ? "Skill updated" : "Skill added")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save skill")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Skill" : "Add Skill"}</DialogTitle>
          <DialogDescription>Record a skill with category and proficiency.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Skill Name <span className="text-rose-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. React" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Proficiency</Label>
              <Select value={form.proficiency} onValueChange={(v) => setForm({ ...form, proficiency: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_LEVELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Years of Experience</Label>
              <Input type="number" min={0} step={0.5} value={form.yearsOfExperience} onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Used Date</Label>
              <Input type="date" value={form.lastUsedDate} onChange={(e) => setForm({ ...form, lastUsedDate: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.verifiedByManager}
              onChange={(e) => setForm({ ...form, verifiedByManager: e.target.checked })}
              className="h-4 w-4 rounded border-input accent-emerald-500"
            />
            Verified by manager
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Add Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Certification Dialog
// ============================================================

function CertDialog({
  open, onOpenChange, employeeId, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  existing: CertRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    name: "", issuingAuthority: "", issueDate: "", expiryDate: "",
    certificateId: "", certificateUrl: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          name: existing.name || "",
          issuingAuthority: existing.issuingAuthority || "",
          issueDate: existing.issueDate ? format(new Date(existing.issueDate), "yyyy-MM-dd") : "",
          expiryDate: existing.expiryDate ? format(new Date(existing.expiryDate), "yyyy-MM-dd") : "",
          certificateId: existing.certificateId || "",
          certificateUrl: existing.certificateUrl || "",
        })
      } else {
        setForm({ name: "", issuingAuthority: "", issueDate: "", expiryDate: "", certificateId: "", certificateUrl: "" })
      }
    }
  }, [open, existing])

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Certification name is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        issuingAuthority: form.issuingAuthority || undefined,
        issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        certificateId: form.certificateId || undefined,
        certificateUrl: form.certificateUrl || undefined,
      }
      const url = isEdit ? `/api/employees/${employeeId}/certifications/${existing!.id}` : `/api/employees/${employeeId}/certifications`
      const method = isEdit ? "PATCH" : "POST"
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save certification")
      toast.success(isEdit ? "Certification updated" : "Certification added")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save certification")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Certification" : "Add Certification"}</DialogTitle>
          <DialogDescription>Record a professional certification or license.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Certification Name <span className="text-rose-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AWS Solutions Architect" />
          </div>
          <div className="space-y-1.5">
            <Label>Issuing Authority</Label>
            <Input value={form.issuingAuthority} onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })} placeholder="e.g. Amazon Web Services" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Certificate ID</Label>
            <Input value={form.certificateId} onChange={(e) => setForm({ ...form, certificateId: e.target.value })} placeholder="e.g. AWS-ASA-123456" />
          </div>
          <div className="space-y-1.5">
            <Label>Certificate URL</Label>
            <Input value={form.certificateUrl} onChange={(e) => setForm({ ...form, certificateUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Add Certification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
