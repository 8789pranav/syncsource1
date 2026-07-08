"use client"

// ============================================================
// PerformanceTab — Goals | Reviews | PIP sub-tabs with a
// performance score gauge (Recharts radial bar).
// ------------------------------------------------------------
// APIs:
//   GET/POST /api/employees/[id]/goals (+ PATCH/DELETE /<id>)
//   GET/POST /api/employees/[id]/reviews (+ PATCH/DELETE /<id>)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts"
import {
  Target, Star, Plus, Pencil, Trash2, RefreshCw, Loader2, Eye,
  AlertTriangle, Award, TrendingUp, CheckCircle2, Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- types ----------

interface GoalRec {
  id: string
  title: string
  description?: string | null
  kra?: string | null
  kpi?: string | null
  targetValue?: string | null
  achievedValue?: string | null
  progress?: number | null
  weightage?: number | null
  cycle?: string | null
  status: string
  startDate?: string | Date | null
  endDate?: string | Date | null
}

interface ReviewRec {
  id: string
  cycle: string
  type?: string | null
  reviewerName?: string | null
  rating?: number | null
  comments?: string | null
  promotionRecommended?: boolean
  incrementRecommended?: number | null
  status: string
  pipStatus?: string | null
  pipNotes?: string | null
  reviewDate?: string | Date | null
  finalizedAt?: string | Date | null
}

// ---------- helpers ----------

const GOAL_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Submitted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Manager reviewed": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "HR reviewed": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Finalized: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
}
const REVIEW_STATUS_COLORS: Record<string, string> = GOAL_STATUS_COLORS

const REVIEW_TYPES = ["Self", "Manager", "HR", "Final", "360"]
const GOAL_STATUS_OPTIONS = ["Draft", "Submitted", "Manager reviewed", "HR reviewed", "Finalized"]
const REVIEW_STATUS_OPTIONS = ["Draft", "Submitted", "Manager reviewed", "HR reviewed", "Finalized"]
const PIP_OPTIONS = ["None", "Active", "Completed", "Cancelled"]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function Stars({ rating }: { rating?: number | null }) {
  const r = rating || 0
  return (
    <div className="flex items-center gap-0.5" aria-label={`${r} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(r) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40"
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1 tabular-nums">{r.toFixed(1)}</span>
    </div>
  )
}

function ratingColor(r?: number | null) {
  const v = r || 0
  if (v >= 4.5) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
  if (v >= 3.5) return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
  if (v >= 2.5) return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
  if (v > 0) return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
  return "bg-muted text-muted-foreground"
}

// ============================================================
// Component
// ============================================================

export default function PerformanceTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [goals, setGoals] = React.useState<GoalRec[]>([])
  const [reviews, setReviews] = React.useState<ReviewRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState<string>("goals")
  const [goalDialog, setGoalDialog] = React.useState<{ open: boolean; target: GoalRec | null }>({ open: false, target: null })
  const [reviewDialog, setReviewDialog] = React.useState<{ open: boolean; target: ReviewRec | null }>({ open: false, target: null })
  const [viewReview, setViewReview] = React.useState<ReviewRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ kind: "goal" | "review"; rec: any } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [gRes, rRes] = await Promise.all([
        apiFetch(`/api/employees/${employeeId}/goals`),
        apiFetch(`/api/employees/${employeeId}/reviews`),
      ])
      const gData = await gRes.json()
      const rData = await rRes.json()
      if (!gRes.ok) throw new Error(gData?.error || "Failed to load goals")
      if (!rRes.ok) throw new Error(rData?.error || "Failed to load reviews")
      setGoals(gData?.items || [])
      setReviews(rData?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load performance data")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // Performance score = avg of finalized review ratings (1-5 → 0-100)
  const avgRating = React.useMemo(() => {
    const rated = reviews.filter((r) => typeof r.rating === "number" && r.rating > 0)
    if (rated.length === 0) return 0
    return rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length
  }, [reviews])
  const scorePct = Math.round((avgRating / 5) * 100)

  const pipReviews = reviews.filter((r) => r.pipStatus === "Active")
  const goalsFinalized = goals.filter((g) => g.status === "Finalized").length
  const promotionsRecommended = reviews.filter((r) => r.promotionRecommended).length

  const gaugeData = [{ name: "score", value: scorePct, fill: scorePct >= 80 ? "#10b981" : scorePct >= 60 ? "#06b6d4" : scorePct >= 40 ? "#f59e0b" : "#f43f5e" }]

  async function handleDelete() {
    if (!deleteTarget) return
    const { kind, rec } = deleteTarget
    try {
      const url = kind === "goal"
        ? `/api/employees/${employeeId}/goals/${rec.id}`
        : `/api/employees/${employeeId}/reviews/${rec.id}`
      const res = await apiFetch(url, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success(`${kind === "goal" ? "Goal" : "Review"} deleted`)
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Performance</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Goals, review cycles, and performance improvement plans (PIP) for this employee.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stat strip + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 rounded-xl border border-border/60 bg-card p-4 shadow-soft">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Performance Score</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="68%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "color-mix(in oklch, var(--muted) 50%, transparent)" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-24 mb-12 pointer-events-none">
            <p className="text-2xl font-bold tabular-nums">{scorePct}</p>
            <p className="text-xs text-muted-foreground">avg {avgRating.toFixed(1)} / 5</p>
          </div>
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Goals" value={goals.length} icon={Target} accent="emerald" sub={`${goalsFinalized} finalized`} />
          <StatCard label="Reviews" value={reviews.length} icon={Star} accent="cyan" />
          <StatCard label="Promotions" value={promotionsRecommended} icon={Award} accent="amber" sub="recommended" />
          <StatCard label="Active PIP" value={pipReviews.length} icon={AlertTriangle} accent="coral" />
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="goals" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Goals</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Reviews</TabsTrigger>
          <TabsTrigger value="pip" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> PIP</TabsTrigger>
        </TabsList>

        {/* GOALS */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setGoalDialog({ open: true, target: null })}>
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : goals.length === 0 ? (
            <EmptyState icon={Target} title="No goals set" description="Add performance goals for this review cycle."
              action={<Button size="sm" onClick={() => setGoalDialog({ open: true, target: null })}><Plus className="h-4 w-4 mr-1.5" /> Add Goal</Button>} />
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
              <ScrollArea className="max-h-[560px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[180px]">Title</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KRA / KPI</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Achieved</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[140px]">Progress</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weight</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cycle</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((g) => (
                      <TableRow key={g.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{g.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {g.kra || "—"}
                          {g.kpi && <div className="text-[11px] text-muted-foreground/70">{g.kpi}</div>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{g.targetValue || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{g.achievedValue || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={g.progress || 0} className="h-1.5 flex-1 min-w-[80px]" />
                            <span className="text-xs tabular-nums text-muted-foreground">{g.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{g.weightage ? `${g.weightage}%` : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{g.cycle || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", GOAL_STATUS_COLORS[g.status] || "bg-muted text-muted-foreground")}>
                            {g.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setGoalDialog({ open: true, target: g })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget({ kind: "goal", rec: g })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* REVIEWS */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setReviewDialog({ open: true, target: null })}>
              <Plus className="h-4 w-4" /> Add Review
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" description="Add the first performance review for this employee."
              action={<Button size="sm" onClick={() => setReviewDialog({ open: true, target: null })}><Plus className="h-4 w-4 mr-1.5" /> Add Review</Button>} />
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
              <ScrollArea className="max-h-[560px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cycle</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviewer</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Promotion</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Increment</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewReview(r)}>
                        <TableCell className="font-medium">{r.cycle}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">{r.type || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.reviewerName || "—"}</TableCell>
                        <TableCell>
                          {r.rating ? (
                            <Badge variant="secondary" className={cn("font-medium border-0 tabular-nums", ratingColor(r.rating))}>
                              {r.rating.toFixed(1)} ★
                            </Badge>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {r.promotionRecommended ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Yes</Badge>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {r.incrementRecommended ? `+${r.incrementRecommended}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", REVIEW_STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(r.reviewDate)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewReview(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setReviewDialog({ open: true, target: r })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget({ kind: "review", rec: r })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* PIP */}
        <TabsContent value="pip" className="space-y-4">
          {pipReviews.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No active PIP" description="This employee is not on a performance improvement plan." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pipReviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-500/5 dark:border-amber-500/20 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <p className="font-semibold">{r.cycle}</p>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">{r.pipStatus}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.type || "—"} · {r.reviewerName || "—"}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewReview(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground mb-1">PIP Notes</p>
                    <p className="whitespace-pre-wrap bg-card/60 rounded-lg p-2 border border-border/40">{r.pipNotes || "No notes recorded."}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <span>Rating: <span className="font-medium">{r.rating ? r.rating.toFixed(1) : "—"}</span></span>
                    <span>Reviewed: {fmtDate(r.reviewDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal dialog */}
      <GoalDialog
        open={goalDialog.open}
        onOpenChange={(o) => setGoalDialog({ open: o, target: null })}
        employeeId={employeeId}
        existing={goalDialog.target}
        onSaved={load}
      />

      {/* Review dialog */}
      <ReviewDialog
        open={reviewDialog.open}
        onOpenChange={(o) => setReviewDialog({ open: o, target: null })}
        employeeId={employeeId}
        existing={reviewDialog.target}
        onSaved={load}
      />

      {/* Review view dialog */}
      <Dialog open={!!viewReview} onOpenChange={(o) => !o && setViewReview(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {viewReview?.cycle}
              {viewReview?.type && <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">{viewReview.type}</Badge>}
              {viewReview && (
                <Badge variant="secondary" className={cn("font-medium border-0", REVIEW_STATUS_COLORS[viewReview.status] || "bg-muted text-muted-foreground")}>
                  {viewReview.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Reviewer: {viewReview?.reviewerName || "—"} · {fmtDate(viewReview?.reviewDate)}</DialogDescription>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <div className="mt-1"><Stars rating={viewReview.rating} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Promotion</p>
                  <p className="font-medium">{viewReview.promotionRecommended ? "Recommended" : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Increment</p>
                  <p className="font-medium tabular-nums">{viewReview.incrementRecommended ? `+${viewReview.incrementRecommended}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PIP</p>
                  <p className="font-medium">{viewReview.pipStatus || "None"}</p>
                </div>
              </div>
              {viewReview.comments && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Comments</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{viewReview.comments}</p>
                </div>
              )}
              {viewReview.pipNotes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">PIP Notes</p>
                  <p className="text-sm whitespace-pre-wrap bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 border border-amber-200/40 dark:border-amber-500/20">{viewReview.pipNotes}</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setReviewDialog({ open: true, target: viewReview }); setViewReview(null) }}>
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteTarget?.kind}. This action cannot be undone.
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
// Goal Dialog (Create / Edit)
// ============================================================

function GoalDialog({
  open, onOpenChange, employeeId, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  existing: GoalRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    title: "", description: "", kra: "", kpi: "",
    targetValue: "", achievedValue: "", progress: "0", weightage: "",
    cycle: `FY${new Date().getFullYear()}`, status: "Draft",
    startDate: "", endDate: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          title: existing.title || "",
          description: existing.description || "",
          kra: existing.kra || "",
          kpi: existing.kpi || "",
          targetValue: existing.targetValue || "",
          achievedValue: existing.achievedValue || "",
          progress: String(existing.progress ?? 0),
          weightage: existing.weightage ? String(existing.weightage) : "",
          cycle: existing.cycle || `FY${new Date().getFullYear()}`,
          status: existing.status || "Draft",
          startDate: existing.startDate ? format(new Date(existing.startDate), "yyyy-MM-dd") : "",
          endDate: existing.endDate ? format(new Date(existing.endDate), "yyyy-MM-dd") : "",
        })
      } else {
        setForm({
          title: "", description: "", kra: "", kpi: "",
          targetValue: "", achievedValue: "", progress: "0", weightage: "",
          cycle: `FY${new Date().getFullYear()}`, status: "Draft",
          startDate: "", endDate: "",
        })
      }
    }
  }, [open, existing])

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("Title is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        kra: form.kra || undefined,
        kpi: form.kpi || undefined,
        targetValue: form.targetValue || undefined,
        achievedValue: form.achievedValue || undefined,
        progress: Number(form.progress || 0),
        weightage: form.weightage ? Number(form.weightage) : undefined,
        cycle: form.cycle || undefined,
        status: form.status,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      }
      const url = isEdit ? `/api/employees/${employeeId}/goals/${existing!.id}` : `/api/employees/${employeeId}/goals`
      const method = isEdit ? "PATCH" : "POST"
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save goal")
      toast.success(isEdit ? "Goal updated" : "Goal added")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save goal")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Goal" : "Add Goal"}</DialogTitle>
          <DialogDescription>Define a performance goal with KRA, KPI, target, and progress.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title <span className="text-rose-500">*</span></Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Increase Q1 sales by 20%" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>KRA</Label>
            <Input value={form.kra} onChange={(e) => setForm({ ...form, kra: e.target.value })} placeholder="Key Result Area" />
          </div>
          <div className="space-y-1.5">
            <Label>KPI</Label>
            <Input value={form.kpi} onChange={(e) => setForm({ ...form, kpi: e.target.value })} placeholder="Key Performance Indicator" />
          </div>
          <div className="space-y-1.5">
            <Label>Target Value</Label>
            <Input value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} placeholder="e.g. 100" />
          </div>
          <div className="space-y-1.5">
            <Label>Achieved Value</Label>
            <Input value={form.achievedValue} onChange={(e) => setForm({ ...form, achievedValue: e.target.value })} placeholder="e.g. 78" />
          </div>
          <div className="space-y-1.5">
            <Label>Progress %</Label>
            <Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Weightage %</Label>
            <Input type="number" min={0} max={100} value={form.weightage} onChange={(e) => setForm({ ...form, weightage: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Cycle</Label>
            <Input value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} placeholder={`FY${new Date().getFullYear()}`} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Add Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Review Dialog (Create / Edit)
// ============================================================

function ReviewDialog({
  open, onOpenChange, employeeId, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  existing: ReviewRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    cycle: `FY${new Date().getFullYear()}`,
    type: "Self",
    reviewerName: "",
    rating: "0",
    comments: "",
    promotionRecommended: false,
    incrementRecommended: "",
    status: "Draft",
    pipStatus: "None",
    pipNotes: "",
    reviewDate: format(new Date(), "yyyy-MM-dd"),
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          cycle: existing.cycle || `FY${new Date().getFullYear()}`,
          type: existing.type || "Self",
          reviewerName: existing.reviewerName || "",
          rating: String(existing.rating ?? 0),
          comments: existing.comments || "",
          promotionRecommended: !!existing.promotionRecommended,
          incrementRecommended: existing.incrementRecommended ? String(existing.incrementRecommended) : "",
          status: existing.status || "Draft",
          pipStatus: existing.pipStatus || "None",
          pipNotes: existing.pipNotes || "",
          reviewDate: existing.reviewDate ? format(new Date(existing.reviewDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        })
      } else {
        setForm({
          cycle: `FY${new Date().getFullYear()}`, type: "Self", reviewerName: "", rating: "0",
          comments: "", promotionRecommended: false, incrementRecommended: "",
          status: "Draft", pipStatus: "None", pipNotes: "",
          reviewDate: format(new Date(), "yyyy-MM-dd"),
        })
      }
    }
  }, [open, existing])

  async function handleSubmit() {
    if (!form.cycle.trim()) { toast.error("Cycle is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        cycle: form.cycle,
        type: form.type,
        reviewerName: form.reviewerName || undefined,
        rating: Number(form.rating || 0),
        comments: form.comments || undefined,
        promotionRecommended: !!form.promotionRecommended,
        incrementRecommended: form.incrementRecommended ? Number(form.incrementRecommended) : undefined,
        status: form.status,
        pipStatus: form.pipStatus,
        pipNotes: form.pipNotes || undefined,
        reviewDate: form.reviewDate ? new Date(form.reviewDate).toISOString() : undefined,
      }
      const url = isEdit ? `/api/employees/${employeeId}/reviews/${existing!.id}` : `/api/employees/${employeeId}/reviews`
      const method = isEdit ? "PATCH" : "POST"
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save review")
      toast.success(isEdit ? "Review updated" : "Review added")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save review")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Review" : "Add Review"}</DialogTitle>
          <DialogDescription>Record a performance review for this cycle.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cycle <span className="text-rose-500">*</span></Label>
            <Input value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} placeholder={`FY${new Date().getFullYear()}`} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEW_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reviewer Name</Label>
            <Input value={form.reviewerName} onChange={(e) => setForm({ ...form, reviewerName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Rating (1–5)</Label>
            <Input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Review Date</Label>
            <Input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEW_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Increment Recommended %</Label>
            <Input type="number" min={0} value={form.incrementRecommended} onChange={(e) => setForm({ ...form, incrementRecommended: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-1.5 flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.promotionRecommended}
                onChange={(e) => setForm({ ...form, promotionRecommended: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-emerald-500"
              />
              Promotion Recommended
            </label>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Comments</Label>
            <Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>PIP Status</Label>
            <Select value={form.pipStatus} onValueChange={(v) => setForm({ ...form, pipStatus: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIP_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.pipStatus !== "None" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>PIP Notes</Label>
              <Textarea value={form.pipNotes} onChange={(e) => setForm({ ...form, pipNotes: e.target.value })} rows={2} />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Add Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
