import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

// GET /api/attendance-bulk
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const items = await db.attendanceBulkUpdate.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return listResponse(items);
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// POST /api/attendance-bulk — create + process a bulk update
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const employeeIds: string[] = Array.isArray(body.employeeIds)
      ? body.employeeIds
      : (typeof body.employeeIds === "string" ? body.employeeIds.split(",").filter(Boolean) : []);
    if (!employeeIds.length) return bad("At least one employee required");
    if (!body.actionType) return bad("actionType is required");
    if (!body.fromDate || !body.toDate) return bad("fromDate and toDate are required");

    const start = new Date(body.fromDate); start.setHours(0, 0, 0, 0);
    const end = new Date(body.toDate); end.setHours(23, 59, 59, 999);

    const rec = await db.attendanceBulkUpdate.create({
      data: {
        tenantId,
        requestedBy: body.requestedBy || "HR Admin",
        actionType: body.actionType,
        fromDate: start,
        toDate: end,
        employeeIds: employeeIds.join(","),
        filtersJson: body.filtersJson ? JSON.stringify(body.filtersJson) : null,
        newStatus: body.newStatus || null,
        newInTime: body.newInTime || null,
        newOutTime: body.newOutTime || null,
        reason: body.reason || null,
        status: "Processed",
        processedAt: new Date(),
        affectedCount: 0,
        auditJson: JSON.stringify({ reason: body.reason, actionType: body.actionType }),
      },
    });

    // Apply the bulk action
    const statusMap: Record<string, string> = {
      MarkPresent: "Present", MarkAbsent: "Absent", MarkHalfDay: "Half Day",
      MarkWeeklyOff: "WeeklyOff", MarkHoliday: "Holiday", MarkWFH: "WFH",
      MarkOnDuty: "OnDuty", MarkLWP: "LWP",
    };

    let affected = 0;

    if (statusMap[body.actionType]) {
      const newStatus = statusMap[body.actionType];
      for (const empId of employeeIds) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
          const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
          const existing = await db.attendance.findFirst({
            where: { employeeId: empId, date: { gte: dayStart, lte: dayEnd } },
          });
          if (existing) {
            await db.attendance.update({ where: { id: existing.id }, data: { status: newStatus, remarks: body.reason || existing.remarks } });
          } else {
            await db.attendance.create({
              data: { tenantId, employeeId: empId, date: new Date(d), status: newStatus, remarks: body.reason, source: "AdminEntry" },
            });
          }
          affected++;
        }
      }
    } else if (body.actionType === "Lock") {
      for (const empId of employeeIds) {
        await db.attendance.updateMany({
          where: { employeeId: empId, date: { gte: start, lte: end } },
          data: { isLocked: true },
        });
        affected++;
      }
    } else if (body.actionType === "Unlock") {
      for (const empId of employeeIds) {
        await db.attendance.updateMany({
          where: { employeeId: empId, date: { gte: start, lte: end } },
          data: { isLocked: false },
        });
        affected++;
      }
    }

    await db.attendanceBulkUpdate.update({
      where: { id: rec.id },
      data: { affectedCount: affected },
    });

    // Audit log
    await db.attendanceAuditLog.create({
      data: {
        tenantId,
        module: "Attendance",
        action: "BulkUpdate",
        referenceType: "AttendanceBulkUpdate",
        referenceId: rec.id,
        newValue: JSON.stringify({ actionType: body.actionType, employeeCount: employeeIds.length, affected }),
        performedBy: body.requestedBy || "HR Admin",
        reason: body.reason || null,
      },
    });

    return created({ ...rec, affectedCount: affected });
  } catch (err: any) {
    console.error("[attendance-bulk POST]", err);
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}
