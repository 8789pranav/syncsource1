// Dashboard analytics aggregator for the default tenant.
// GET /api/dashboard → returns aggregate stats, headcount breakdowns,
// trends (joining, leave, attendance), asset status, recent joiners,
// upcoming holidays, pending approval requests, and a "team pulse"
// feed (on-leave-today, upcoming birthdays, work anniversaries).

import { db } from "@/lib/db"
import { ensureTenant, ok, bad } from "@/lib/api-helpers"

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Whole-day difference between a base date and an upcoming month/day anniversary.
function daysUntilNextAnniversary(src: Date, from: Date): number {
  const m = src.getMonth()
  const d = src.getDate()
  let next = new Date(from.getFullYear(), m, d)
  next.setHours(0, 0, 0, 0)
  const base = new Date(from); base.setHours(0, 0, 0, 0)
  if (next < base) next = new Date(from.getFullYear() + 1, m, d)
  return Math.round((next.getTime() - base.getTime()) / 86400000)
}

export async function GET() {
  try {
    const tenantId = await ensureTenant()

    // ---------- employee stats ----------
    const employees = await db.employee.findMany({
      where: { tenantId },
      select: {
        id: true, firstName: true, lastName: true, displayName: true,
        employeeCode: true, gender: true, dateOfBirth: true, dateOfJoining: true,
        employeeStatus: true, departmentId: true, locationId: true, designationId: true,
      },
    })
    const totalEmployees = employees.length
    const activeEmployees = employees.filter((e) => e.employeeStatus === "Active").length
    const onNotice = employees.filter((e) => e.employeeStatus === "On Notice").length

    // newThisMonth — joined this calendar month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const newThisMonth = employees.filter((e) => e.dateOfJoining && e.dateOfJoining >= monthStart).length

    // ---------- pending approvals ----------
    const [pendingLeaves, pendingAssets] = await Promise.all([
      db.leaveApplication.count({ where: { tenantId, status: "Pending" } }),
      db.assetRequest.count({ where: { tenantId, status: "Pending" } }),
    ])
    const pendingApprovals = pendingLeaves + pendingAssets

    // openTickets — ProfileUpdateRequests pending (proxy for "tickets")
    const openTickets = await db.profileUpdateRequest.count({ where: { tenantId, status: "Pending" } })

    // ---------- assets ----------
    const assets = await db.asset.findMany({ where: { tenantId }, select: { id: true, status: true } })
    const assetsAssigned = assets.filter((a) => a.status === "Assigned").length
    const assetsInStock = assets.filter((a) => a.status === "In Stock").length

    // ---------- reference maps (departments, designations) ----------
    const [depts, allDesigs] = await Promise.all([
      db.department.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      db.designation.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ])
    const desigMap = new Map<string, string>()
    for (const d of allDesigs) desigMap.set(d.id, d.name)
    const desigName = (id?: string | null) => (id ? desigMap.get(id) || "—" : "—")
    const deptName = (id?: string | null) => depts.find((d) => d.id === id)?.name || "—"

    // ---------- on leave today ----------
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)
    const approvedLeavesToday = await db.leaveApplication.findMany({
      where: {
        tenantId, status: "Approved",
        fromDate: { lte: todayEnd }, toDate: { gte: today },
      },
      select: {
        employeeId: true,
        toDate: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true, designationId: true },
        },
      },
    })
    const onLeaveToday = new Set(approvedLeavesToday.map((l) => l.employeeId)).size
    // de-duplicate by employee (an employee may have overlapping leave records)
    const onLeaveTodayMap = new Map<string, { id: string; name: string; code: string; designation: string; returnDate: Date }>()
    for (const l of approvedLeavesToday) {
      if (!l.employee) continue
      const id = l.employee.id
      if (onLeaveTodayMap.has(id)) {
        // keep the later return date
        const existing = onLeaveTodayMap.get(id)!
        if (l.toDate > existing.returnDate) existing.returnDate = l.toDate
        continue
      }
      onLeaveTodayMap.set(id, {
        id,
        name: l.employee.displayName || `${l.employee.firstName} ${l.employee.lastName || ""}`.trim(),
        code: l.employee.employeeCode,
        designation: desigName(l.employee.designationId),
        returnDate: l.toDate,
      })
    }
    const onLeaveTodayList = Array.from(onLeaveTodayMap.values())

    // ---------- avg attendance ----------
    // Compute over existing attendance records: attended / total * 100.
    const attRecords = await db.attendance.findMany({
      where: { tenantId },
      select: { status: true },
    })
    const attendedStatuses = ["Present", "Late", "WFH", "OD"]
    const attendedCount = attRecords.filter((r) => attendedStatuses.includes(r.status)).length
    const avgAttendance = attRecords.length > 0
      ? Math.round((attendedCount / attRecords.length) * 100)
      : 0

    // ---------- headcount by department ----------
    const headcountByDept = depts.map((d) => ({
      name: d.name,
      value: employees.filter((e) => e.departmentId === d.id).length,
    })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

    // ---------- headcount by location ----------
    const locs = await db.location.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    })
    const headcountByLocation = locs.map((l) => ({
      name: l.name.replace(/ Office$/, ""),
      value: employees.filter((e) => e.locationId === l.id).length,
    })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

    // ---------- gender ratio ----------
    const maleCount = employees.filter((e) => e.gender === "Male").length
    const femaleCount = employees.filter((e) => e.gender === "Female").length
    const otherCount = employees.filter((e) => e.gender && !["Male", "Female"].includes(e.gender)).length
    const genderRatio: { name: string; value: number }[] = []
    if (maleCount > 0) genderRatio.push({ name: "Male", value: maleCount })
    if (femaleCount > 0) genderRatio.push({ name: "Female", value: femaleCount })
    if (otherCount > 0) genderRatio.push({ name: "Other", value: otherCount })

    // ---------- joinings vs exits (last 6 months) ----------
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const joiningsByMonth: { month: string; joinings: number; exits: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const joinings = employees.filter((e) =>
        e.dateOfJoining && e.dateOfJoining >= mStart && e.dateOfJoining <= mEnd
      ).length
      // exits — for demo, we have no exit records (all employees still active/on notice).
      const exits = 0
      joiningsByMonth.push({ month: MONTH_SHORT[mStart.getMonth()], joinings, exits })
    }

    // ---------- leave trend (last 6 months) ----------
    const leaveApps = await db.leaveApplication.findMany({
      where: { tenantId, appliedAt: { gte: sixMonthsAgo } },
      select: { appliedAt: true },
    })
    const leaveTrend: { month: string; leaves: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const leaves = leaveApps.filter((l) => l.appliedAt >= mStart && l.appliedAt <= mEnd).length
      leaveTrend.push({ month: MONTH_SHORT[mStart.getMonth()], leaves })
    }

    // ---------- attendance trend (last 7 days) ----------
    const attendanceTrend: { day: string; present: number; absent: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now); dStart.setHours(0, 0, 0, 0); dStart.setDate(dStart.getDate() - i)
      const dEnd = new Date(dStart); dEnd.setHours(23, 59, 59, 999)
      const dayRecords = await db.attendance.findMany({
        where: { tenantId, date: { gte: dStart, lte: dEnd } },
        select: { status: true },
      })
      const present = dayRecords.filter((r) => attendedStatuses.includes(r.status)).length
      const absent = dayRecords.filter((r) => r.status === "Absent").length
      attendanceTrend.push({ day: DAY_SHORT[dStart.getDay()], present, absent })
    }

    // ---------- asset status ----------
    const assetStatusMap = new Map<string, number>()
    for (const a of assets) {
      assetStatusMap.set(a.status, (assetStatusMap.get(a.status) || 0) + 1)
    }
    const assetStatus: { name: string; value: number }[] = Array.from(assetStatusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // ---------- recent joiners (top 5 by dateOfJoining desc) ----------
    const recentJoiners = [...employees]
      .filter((e) => e.dateOfJoining)
      .sort((a, b) => (b.dateOfJoining!.getTime() - a.dateOfJoining!.getTime()))
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        name: e.displayName || `${e.firstName} ${e.lastName || ""}`.trim(),
        code: e.employeeCode,
        designation: desigName(e.designationId),
        department: deptName(e.departmentId),
        dateOfJoining: e.dateOfJoining,
      }))

    // ---------- upcoming birthdays (next 14 days) ----------
    const upcomingBirthdays = employees
      .filter((e) => e.dateOfBirth)
      .map((e) => {
        const dob = e.dateOfBirth!
        const daysUntil = daysUntilNextAnniversary(dob, now)
        const nextDate = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
        if (nextDate < today) nextDate.setFullYear(now.getFullYear() + 1)
        const ageTurning = nextDate.getFullYear() - dob.getFullYear()
        return {
          id: e.id,
          name: e.displayName || `${e.firstName} ${e.lastName || ""}`.trim(),
          code: e.employeeCode,
          designation: desigName(e.designationId),
          nextDate,
          ageTurning,
          daysUntil,
        }
      })
      .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)

    // ---------- upcoming work anniversaries (next 30 days) ----------
    const upcomingAnniversaries = employees
      .filter((e) => e.dateOfJoining)
      .map((e) => {
        const doj = e.dateOfJoining!
        const daysUntil = daysUntilNextAnniversary(doj, now)
        const nextDate = new Date(now.getFullYear(), doj.getMonth(), doj.getDate())
        if (nextDate < today) nextDate.setFullYear(now.getFullYear() + 1)
        const yearsCompleted = nextDate.getFullYear() - doj.getFullYear()
        return {
          id: e.id,
          name: e.displayName || `${e.firstName} ${e.lastName || ""}`.trim(),
          code: e.employeeCode,
          designation: desigName(e.designationId),
          joiningDate: doj,
          nextDate,
          yearsCompleted,
          daysUntil,
        }
      })
      .filter((a) => a.daysUntil >= 0 && a.daysUntil <= 30 && a.yearsCompleted >= 1)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)

    // ---------- upcoming holidays (next 3) ----------
    const upcomingHolidays = await db.holiday.findMany({
      where: { tenantId, date: { gte: today } },
      orderBy: { date: "asc" },
      take: 3,
      select: { id: true, name: true, date: true, type: true },
    })

    // ---------- pending requests (leave + asset) ----------
    const pendingLeaveApps = await db.leaveApplication.findMany({
      where: { tenantId, status: "Pending" },
      include: {
        employee: { select: { firstName: true, lastName: true, displayName: true, employeeCode: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { appliedAt: "desc" },
    })
    const pendingAssetReqs = await db.assetRequest.findMany({
      where: { tenantId, status: "Pending" },
      include: {
        employee: { select: { firstName: true, lastName: true, displayName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    const pendingRequests = [
      ...pendingLeaveApps.map((l) => ({
        id: l.id, kind: "Leave" as const,
        employeeName: l.employee.displayName || `${l.employee.firstName} ${l.employee.lastName || ""}`.trim(),
        employeeCode: l.employee.employeeCode,
        type: l.leaveType.name,
        date: l.fromDate,
        status: l.status,
      })),
      ...pendingAssetReqs.map((a) => ({
        id: a.id, kind: "Asset" as const,
        employeeName: a.employee.displayName || `${a.employee.firstName} ${a.employee.lastName || ""}`.trim(),
        employeeCode: a.employee.employeeCode,
        type: a.requestType + " Request",
        date: a.createdAt,
        status: a.status,
      })),
    ]

    return ok({
      stats: {
        totalEmployees,
        activeEmployees,
        onNotice,
        newThisMonth,
        pendingApprovals,
        openTickets,
        assetsAssigned,
        assetsInStock,
        onLeaveToday,
        avgAttendance,
      },
      headcountByDept,
      headcountByLocation,
      genderRatio,
      joiningsByMonth,
      leaveTrend,
      attendanceTrend,
      assetStatus,
      recentJoiners,
      upcomingHolidays,
      pendingRequests,
      // ---- Team Pulse feed ----
      onLeaveTodayList,
      upcomingBirthdays,
      upcomingAnniversaries,
    })
  } catch (err: any) {
    console.error("[dashboard] error:", err)
    return bad("Dashboard fetch failed: " + (err?.message || String(err)), 500)
  }
}
