import { dashboardRepository } from "@/lib/repositories/dashboard.repository"

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const ATTENDED_STATUSES = ["Present", "Late", "WFH", "OD"]

function daysUntilNextAnniversary(src: Date, from: Date): number {
  const m = src.getMonth()
  const d = src.getDate()
  let next = new Date(from.getFullYear(), m, d)
  next.setHours(0, 0, 0, 0)
  const base = new Date(from); base.setHours(0, 0, 0, 0)
  if (next < base) next = new Date(from.getFullYear() + 1, m, d)
  return Math.round((next.getTime() - base.getTime()) / 86400000)
}

export const dashboardService = {
  async getDashboardData(tenantId: string) {
    const now = new Date()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [employees, pendingCounts, assetData, depts, allDesigs, approvedLeavesToday, attRecords, leaveApps, upcomingHolidays, pendingReqs, locs] =
      await Promise.all([
        dashboardRepository.getEmployeeStats(tenantId),
        dashboardRepository.getPendingCounts(tenantId),
        dashboardRepository.getAssetStats(tenantId),
        dashboardRepository.getDepartments(tenantId),
        dashboardRepository.getDesignations(tenantId),
        dashboardRepository.getApprovedLeavesToday(tenantId, today, todayEnd),
        dashboardRepository.getAttendanceStats(tenantId),
        dashboardRepository.getLeaveTrend(tenantId, sixMonthsAgo),
        dashboardRepository.getUpcomingHolidays(tenantId, today),
        dashboardRepository.getPendingRequests(tenantId),
        dashboardRepository.getLocations(tenantId),
      ])

    const totalEmployees = employees.length
    const activeEmployees = employees.filter((e) => e.employeeStatus === "Active").length
    const onNotice = employees.filter((e) => e.employeeStatus === "On Notice").length
    const newThisMonth = employees.filter((e) => e.dateOfJoining && e.dateOfJoining >= monthStart).length

    const desigMap = new Map<string, string>()
    for (const d of allDesigs) desigMap.set(d.id, d.name)
    const desigName = (id?: string | null) => (id ? desigMap.get(id) || "—" : "—")
    const deptName = (id?: string | null) => depts.find((d) => d.id === id)?.name || "—"

    const onLeaveTodayMap = new Map<string, { id: string; name: string; code: string; designation: string; returnDate: Date }>()
    for (const l of approvedLeavesToday) {
      if (!l.employee) continue
      const id = l.employee.id
      if (onLeaveTodayMap.has(id)) {
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

    const attendedCount = attRecords.filter((r) => ATTENDED_STATUSES.includes(r.status)).length
    const avgAttendance = attRecords.length > 0 ? Math.round((attendedCount / attRecords.length) * 100) : 0

    const headcountByDept = depts.map((d) => ({
      name: d.name,
      value: employees.filter((e) => e.departmentId === d.id).length,
    })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

    const headcountByLocation = locs.map((l) => ({
      name: l.name.replace(/ Office$/, ""),
      value: employees.filter((e) => e.locationId === l.id).length,
    })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

    const maleCount = employees.filter((e) => e.gender === "Male").length
    const femaleCount = employees.filter((e) => e.gender === "Female").length
    const otherCount = employees.filter((e) => e.gender && !["Male", "Female"].includes(e.gender)).length
    const genderRatio: { name: string; value: number }[] = []
    if (maleCount > 0) genderRatio.push({ name: "Male", value: maleCount })
    if (femaleCount > 0) genderRatio.push({ name: "Female", value: femaleCount })
    if (otherCount > 0) genderRatio.push({ name: "Other", value: otherCount })

    const joiningsByMonth: { month: string; joinings: number; exits: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const joinings = employees.filter((e) => e.dateOfJoining && e.dateOfJoining >= mStart && e.dateOfJoining <= mEnd).length
      joiningsByMonth.push({ month: MONTH_SHORT[mStart.getMonth()], joinings, exits: 0 })
    }

    const leaveTrend: { month: string; leaves: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const leaves = leaveApps.filter((l) => l.appliedAt >= mStart && l.appliedAt <= mEnd).length
      leaveTrend.push({ month: MONTH_SHORT[mStart.getMonth()], leaves })
    }

    const attendanceTrend: { day: string; present: number; absent: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now); dStart.setHours(0, 0, 0, 0); dStart.setDate(dStart.getDate() - i)
      const dEnd = new Date(dStart); dEnd.setHours(23, 59, 59, 999)
      const dayRecords = await dashboardRepository.getAttendanceForDay(tenantId, dStart, dEnd)
      const present = dayRecords.filter((r) => ATTENDED_STATUSES.includes(r.status)).length
      const absent = dayRecords.filter((r) => r.status === "Absent").length
      attendanceTrend.push({ day: DAY_SHORT[dStart.getDay()], present, absent })
    }

    const assetStatusMap = new Map<string, number>()
    for (const a of assetData.assets) {
      assetStatusMap.set(a.status, (assetStatusMap.get(a.status) || 0) + 1)
    }
    const assetStatus = Array.from(assetStatusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

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
          nextDate, ageTurning, daysUntil,
        }
      })
      .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)

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
          joiningDate: doj, nextDate, yearsCompleted, daysUntil,
        }
      })
      .filter((a) => a.daysUntil >= 0 && a.daysUntil <= 30 && a.yearsCompleted >= 1)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)

    const pendingRequests = [
      ...pendingReqs.pendingLeaveApps.map((l) => ({
        id: l.id, kind: "Leave" as const,
        employeeName: l.employee.displayName || `${l.employee.firstName} ${l.employee.lastName || ""}`.trim(),
        employeeCode: l.employee.employeeCode,
        type: l.leaveType.name,
        date: l.fromDate,
        status: l.status,
      })),
      ...pendingReqs.pendingAssetReqs.map((a) => ({
        id: a.id, kind: "Asset" as const,
        employeeName: a.employee.displayName || `${a.employee.firstName} ${a.employee.lastName || ""}`.trim(),
        employeeCode: a.employee.employeeCode,
        type: a.requestType + " Request",
        date: a.createdAt,
        status: a.status,
      })),
    ]

    return {
      stats: {
        totalEmployees,
        activeEmployees,
        onNotice,
        newThisMonth,
        pendingApprovals: pendingCounts.pendingLeaves + pendingCounts.pendingAssets,
        openTickets: pendingCounts.openTickets,
        assetsAssigned: assetData.assigned,
        assetsInStock: assetData.inStock,
        onLeaveToday: new Set(approvedLeavesToday.map((l) => l.employeeId)).size,
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
      onLeaveTodayList: Array.from(onLeaveTodayMap.values()),
      upcomingBirthdays,
      upcomingAnniversaries,
    }
  },
}
