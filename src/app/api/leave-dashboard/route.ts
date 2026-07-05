import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, bad, ensureTenant } from "@/lib/api-helpers";
import { computeAvailable } from "@/lib/leave-helpers";

// GET /api/leave-dashboard
// Returns a consolidated analytics payload for the Leave module:
//   onLeaveToday, pendingRequests, approvedThisMonth, rejectedThisMonth,
//   upcomingLeaves, balanceAlerts, negativeBalanceEmployees, lopDaysThisMonth,
//   leaveTrendByMonth (6mo), leaveTypeUsage, departmentAbsence,
//   pendingApprovalsAgeing (3 buckets: <24h, 24-72h, >72h).
export async function GET(_req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 6-month trend window.
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      onLeaveToday,
      pendingRequests,
      approvedThisMonth,
      rejectedThisMonth,
      upcomingLeaves,
      allBalances,
      lopApplications,
      leaveTypeRows,
      deptRows,
      pendingApps,
    ] = await Promise.all([
      // 1. Employees on approved leave today.
      db.leaveApplication.findMany({
        where: {
          tenantId,
          status: { in: ["Approved", "AutoApproved"] },
          fromDate: { lte: todayEnd },
          toDate: { gte: todayStart },
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              displayName: true,
              department: { select: { id: true, name: true } },
            },
          },
          leaveType: { select: { id: true, code: true, name: true, color: true } },
        },
      }),
      // 2. Pending (Pending/PendingHR) applications count + list.
      db.leaveApplication.findMany({
        where: { tenantId, status: { in: ["Pending", "PendingHR"] } },
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
          },
          leaveType: { select: { id: true, code: true, name: true, color: true } },
        },
        orderBy: { appliedAt: "asc" },
      }),
      // 3. Approved this month (decisionAt within month).
      db.leaveApplication.count({
        where: {
          tenantId,
          status: { in: ["Approved", "AutoApproved"] },
          decisionAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // 4. Rejected this month.
      db.leaveApplication.count({
        where: {
          tenantId,
          status: "Rejected",
          decisionAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // 5. Upcoming approved leaves (fromDate > today, next 30 days).
      db.leaveApplication.findMany({
        where: {
          tenantId,
          status: { in: ["Approved", "AutoApproved"] },
          fromDate: { gte: todayEnd, lte: new Date(now.getTime() + 30 * 86400000) },
        },
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
          },
          leaveType: { select: { id: true, code: true, name: true, color: true } },
        },
        orderBy: { fromDate: "asc" },
        take: 20,
      }),
      // 6. All balances (current year).
      db.leaveBalance.findMany({
        where: { tenantId, year: now.getFullYear() },
        include: {
          leaveType: { select: { id: true, code: true, name: true, color: true } },
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
          },
        },
      }),
      // 7. LOP days this month — sum of LOP leave application days with status Approved.
      db.leaveApplication.findMany({
        where: {
          tenantId,
          status: { in: ["Approved", "AutoApproved"] },
          fromDate: { gte: monthStart, lte: monthEnd },
          leaveType: { payrollImpact: "LOP" },
        },
        select: { days: true, halfDay: true },
      }),
      // 8. Leave-type usage counts (all-time application counts).
      db.leaveType.findMany({
        where: { tenantId },
        select: {
          id: true,
          code: true,
          name: true,
          color: true,
          category: true,
          _count: { select: { applications: true } },
        },
        orderBy: { displayOrder: "asc" },
      }),
      // 9. Department absence — count of approved leaves today grouped by department.
      db.leaveApplication.findMany({
        where: {
          tenantId,
          status: { in: ["Approved", "AutoApproved"] },
          fromDate: { lte: todayEnd },
          toDate: { gte: todayStart },
        },
        include: {
          employee: { select: { department: { select: { id: true, name: true } } } },
        },
      }),
      // 10. Pending approvals (used for ageing buckets).
      db.leaveApplication.findMany({
        where: { tenantId, status: { in: ["Pending", "PendingHR"] } },
        select: { id: true, appliedAt: true },
      }),
    ]);

    // Compute trend-by-month (6 months).
    const trend: { month: string; count: number; days: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const apps = await db.leaveApplication.findMany({
        where: {
          tenantId,
          appliedAt: { gte: ms, lte: me },
        },
        select: { days: true },
      });
      trend.push({
        month: `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, "0")}`,
        count: apps.length,
        days: apps.reduce((s, a) => s + (a.days || 0), 0),
      });
    }

    // Balance alerts: employees with available <= 2 (low) on any non-LOP leave type.
    const balanceAlerts = allBalances
      .filter((b) => {
        const avail = computeAvailable(b);
        return avail <= 2 && avail > 0;
      })
      .map((b) => ({
        employeeId: b.employeeId,
        employee: b.employee,
        leaveTypeId: b.leaveTypeId,
        leaveType: b.leaveType,
        available: computeAvailable(b),
      }));

    const negativeBalanceEmployees = allBalances
      .filter((b) => computeAvailable(b) < 0)
      .map((b) => ({
        employeeId: b.employeeId,
        employee: b.employee,
        leaveTypeId: b.leaveTypeId,
        leaveType: b.leaveType,
        available: computeAvailable(b),
      }));

    // LOP days this month (sum).
    const lopDaysThisMonth = lopApplications.reduce((s, a) => s + (a.days || 0), 0);

    // Leave-type usage.
    const leaveTypeUsage = leaveTypeRows.map((lt) => ({
      leaveTypeId: lt.id,
      code: lt.code,
      name: lt.name,
      color: lt.color,
      category: lt.category,
      count: lt._count.applications,
    }));

    // Department absence today.
    const deptMap = new Map<string, { departmentId: string; departmentName: string; count: number }>();
    for (const a of deptRows) {
      const dept = a.employee?.department;
      if (!dept) continue;
      const key = dept.id;
      if (!deptMap.has(key)) {
        deptMap.set(key, { departmentId: dept.id, departmentName: dept.name, count: 0 });
      }
      deptMap.get(key)!.count += 1;
    }
    const departmentAbsence = Array.from(deptMap.values()).sort((a, b) => b.count - a.count);

    // Pending approvals ageing buckets.
    const pendingApprovalsAgeing = { lt24h: 0, h24to72h: 0, gt72h: 0 };
    for (const p of pendingApps) {
      const ageMs = now.getTime() - new Date(p.appliedAt).getTime();
      const h = ageMs / 3600000;
      if (h < 24) pendingApprovalsAgeing.lt24h += 1;
      else if (h <= 72) pendingApprovalsAgeing.h24to72h += 1;
      else pendingApprovalsAgeing.gt72h += 1;
    }

    return ok({
      onLeaveToday: onLeaveToday.map((a) => ({
        applicationId: a.id,
        employeeId: a.employeeId,
        employee: a.employee,
        leaveType: a.leaveType,
        fromDate: a.fromDate,
        toDate: a.toDate,
        days: a.days,
        halfDay: a.halfDay,
      })),
      onLeaveTodayCount: onLeaveToday.length,
      pendingRequests: pendingRequests.map((a) => ({
        applicationId: a.id,
        employeeId: a.employeeId,
        employee: a.employee,
        leaveType: a.leaveType,
        fromDate: a.fromDate,
        toDate: a.toDate,
        days: a.days,
        appliedAt: a.appliedAt,
        status: a.status,
      })),
      pendingRequestsCount: pendingRequests.length,
      approvedThisMonth,
      rejectedThisMonth,
      upcomingLeaves: upcomingLeaves.map((a) => ({
        applicationId: a.id,
        employeeId: a.employeeId,
        employee: a.employee,
        leaveType: a.leaveType,
        fromDate: a.fromDate,
        toDate: a.toDate,
        days: a.days,
      })),
      balanceAlerts,
      negativeBalanceEmployees,
      lopDaysThisMonth,
      leaveTrendByMonth: trend,
      leaveTypeUsage,
      departmentAbsence,
      pendingApprovalsAgeing,
      generatedAt: now,
    });
  } catch (err: any) {
    console.error("[leave-dashboard GET]", err);
    return bad("Failed to load dashboard: " + (err?.message || String(err)), 500);
  }
}
