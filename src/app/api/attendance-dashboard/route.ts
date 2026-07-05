import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad } from "@/lib/api-helpers";

// GET /api/attendance-dashboard?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    const totalEmployees = await db.employee.count({ where: { tenantId, employeeStatus: "Active" } });

    const records = await db.attendance.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true, displayName: true,
            department: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            entity: { select: { id: true, legalName: true, tradeName: true } },
          },
        },
        shift: true,
      },
    });

    const statusCounts: Record<string, number> = {};
    for (const r of records) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    const present = statusCounts["Present"] || 0;
    const absent = statusCounts["Absent"] || 0;
    const late = records.filter((r) => r.isLate).length;
    const earlyGoing = records.filter((r) => r.isEarlyGoing).length;
    const halfDay = statusCounts["Half Day"] || 0;
    const onLeave = statusCounts["Leave"] || 0;
    const weeklyOff = statusCounts["WeeklyOff"] || 0;
    const holiday = statusCounts["Holiday"] || 0;
    const wfh = statusCounts["WFH"] || 0;
    const onDuty = statusCounts["OnDuty"] || 0;
    const missingInPunch = statusCounts["MissingInPunch"] || 0;
    const missingOutPunch = statusCounts["MissingOutPunch"] || 0;
    const missingPunch = missingInPunch + missingOutPunch;
    const notYetPunched = Math.max(0, totalEmployees - records.length);
    const lwp = statusCounts["LWP"] || 0;

    // Pending requests
    const pendingRequests = await db.attendanceRequest.count({
      where: { tenantId, status: { in: ["Submitted", "PendingApproval"] } },
    });

    // Pending overtime
    const pendingOvertime = await db.attendanceOvertime.count({
      where: { tenantId, status: "Pending" },
    });

    // Department-wise breakdown
    const deptMap = new Map<string, { name: string; present: number; absent: number; total: number }>();
    for (const r of records) {
      const deptName = r.employee?.department?.name || "Unassigned";
      if (!deptMap.has(deptName)) deptMap.set(deptName, { name: deptName, present: 0, absent: 0, total: 0 });
      const d = deptMap.get(deptName)!;
      d.total++;
      if (r.status === "Present" || r.status === "WFH") d.present++;
      if (r.status === "Absent") d.absent++;
    }

    // Location-wise breakdown
    const locMap = new Map<string, { name: string; present: number; absent: number; total: number }>();
    for (const r of records) {
      const locName = r.employee?.location?.name || "Unknown";
      if (!locMap.has(locName)) locMap.set(locName, { name: locName, present: 0, absent: 0, total: 0 });
      const l = locMap.get(locName)!;
      l.total++;
      if (r.status === "Present" || r.status === "WFH") l.present++;
      if (r.status === "Absent") l.absent++;
    }

    // 7-day trend for late/absent
    const trendDays: { date: string; late: number; absent: number; present: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(date); dStart.setDate(dStart.getDate() - i); dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(dStart); dEnd.setHours(23, 59, 59, 999);
      const dayRecs = await db.attendance.findMany({
        where: { tenantId, date: { gte: dStart, lte: dEnd } },
        select: { status: true, isLate: true },
      });
      trendDays.push({
        date: dStart.toISOString().slice(0, 10),
        late: dayRecs.filter((r) => r.isLate).length,
        absent: dayRecs.filter((r) => r.status === "Absent").length,
        present: dayRecs.filter((r) => r.status === "Present").length,
      });
    }

    return ok({
      date: start.toISOString(),
      stats: {
        totalEmployees,
        present,
        absent,
        late,
        earlyGoing,
        halfDay,
        onLeave,
        weeklyOff,
        holiday,
        wfh,
        onDuty,
        missingPunch,
        missingInPunch,
        missingOutPunch,
        notYetPunched,
        lwp,
        pendingRequests,
        pendingOvertime,
      },
      departmentWise: Array.from(deptMap.values()),
      locationWise: Array.from(locMap.values()),
      trend: trendDays,
    });
  } catch (err: any) {
    console.error("[attendance-dashboard]", err);
    return bad("Failed to load dashboard: " + (err?.message || String(err)), 500);
  }
}
