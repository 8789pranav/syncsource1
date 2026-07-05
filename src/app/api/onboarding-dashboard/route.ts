import { ok, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"

// GET /api/onboarding-dashboard
// Returns aggregated stats for the Onboarding Dashboard (spec #3):
// 14 stat cards + recent activity + SLA breaches + stage distribution + trend.
export async function GET() {
  const tenantId = await ensureTenant()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()) // Sunday
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    totalCandidates,
    candidatesToday,
    activeCandidates,
    completedCandidates,
    withdrawnCandidates,
    workflowsCount,
    activeWorkflows,
    stagesCount,
    documentsCount,
    emailsCount,
    checklistsCount,
    logsToday,
    recentLogs,
    slaBreaches,
    stageDistribution,
    last7DayTrend,
    workflowDistribution,
    priorityDistribution,
  ] = await Promise.all([
    db.onboardingCandidate.count({ where: { tenantId } }),
    db.onboardingCandidate.count({
      where: {
        tenantId,
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    }),
    db.onboardingCandidate.count({ where: { tenantId, status: "Active" } }),
    db.onboardingCandidate.count({ where: { tenantId, status: "Completed" } }),
    db.onboardingCandidate.count({ where: { tenantId, status: "Withdrawn" } }),
    db.onboardingWorkflow.count({ where: { tenantId } }),
    db.onboardingWorkflow.count({ where: { tenantId, status: "Active" } }),
    db.onboardingStage.count({ where: { tenantId } }),
    db.onboardingDocumentTemplate.count({ where: { tenantId } }),
    db.onboardingEmailTemplate.count({ where: { tenantId } }),
    db.onboardingChecklist.count({ where: { tenantId } }),
    db.onboardingLog.count({
      where: {
        tenantId,
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    }),
    db.onboardingLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // SLA breaches: candidates whose current stage SLA is overdue
    db.onboardingCandidate.findMany({
      where: { tenantId, status: "Active" },
      include: {
        currentStage: { select: { id: true, name: true, slaDays: true, color: true } },
        instance: {
          select: {
            stages: {
              where: { status: "Active" },
              select: { id: true, slaDueAt: true },
              take: 1,
            },
          },
        },
      },
    }),
    // Stage distribution: count candidates per stage
    db.onboardingStage.findMany({
      where: { tenantId },
      include: { _count: { select: { currentCandidates: true } } },
      orderBy: { order: "asc" },
    }),
    // 7-day trend: candidates created per day
    Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const dayStart = new Date(startOfToday.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        const count = await db.onboardingCandidate.count({
          where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd } },
        })
        return { date: dayStart.toISOString().slice(0, 10), label: dayStart.toLocaleDateString("en-IN", { weekday: "short" }), count }
      })
    ),
    // Workflow distribution
    db.onboardingWorkflow.findMany({
      where: { tenantId },
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Priority distribution
    db.onboardingCandidate.groupBy({
      by: ["priority"],
      where: { tenantId },
      _count: { _all: true },
    }),
  ])

  // Compute SLA breaches from candidates
  const slaBreachedCandidates = slaBreaches.filter((c) => {
    if (!c.currentStage?.slaDays || !c.enteredAt) return false
    const due = new Date(c.enteredAt).getTime() + c.currentStage.slaDays * 24 * 60 * 60 * 1000
    return due < now.getTime()
  })

  // Joining today / this week
  const joiningToday = await db.onboardingCandidate.count({
    where: { tenantId, joinDate: { gte: startOfToday, lt: endOfToday } },
  })
  const joiningThisWeek = await db.onboardingCandidate.count({
    where: { tenantId, joinDate: { gte: startOfWeek, lt: endOfWeek } },
  })

  return ok({
    cards: {
      totalCandidates,
      candidatesToday,
      onboardingInitiated: activeCandidates,
      inviteSent: await db.onboardingLog.count({ where: { tenantId, logType: "Email", actionType: { contains: "Invite" } } }),
      completedOnboarding: completedCandidates,
      droppedCandidates: withdrawnCandidates,
      joiningToday,
      joiningThisWeek,
      slaBreached: slaBreachedCandidates.length,
      overdueTasks: await db.onboardingInstanceTask.count({
        where: {
          tenantId,
          status: { in: ["Pending", "InProgress"] },
          dueDate: { lt: now },
        },
      }),
      activeWorkflows,
      totalStages: stagesCount,
      documentsCount,
      checklistsCount,
      emailsCount,
    },
    slaBreaches: slaBreachedCandidates.map((c) => ({
      id: c.id,
      candidateName: c.candidateName,
      designation: c.designation,
      stageName: c.currentStage?.name,
      stageColor: c.currentStage?.color,
      enteredAt: c.enteredAt,
      slaDays: c.currentStage?.slaDays,
    })),
    stageDistribution: stageDistribution.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      order: s.order,
      stageType: s.stageType,
      count: s._count.currentCandidates,
    })),
    trend7d: last7DayTrend,
    workflowDistribution: workflowDistribution.map((w) => ({
      id: w.id,
      name: w.name,
      color: w.color,
      count: w._count.candidates,
    })),
    priorityDistribution: priorityDistribution.map((p) => ({
      priority: p.priority,
      count: p._count._all,
    })),
    recentActivity: recentLogs,
    logsToday,
  })
}
