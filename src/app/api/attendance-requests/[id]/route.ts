import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/attendance-requests/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const rec = await db.attendanceRequest.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true, displayName: true,
            department: { select: { id: true, name: true } },
          },
        },
        approvals: { orderBy: { stepOrder: "asc" } },
      },
    });
    if (!rec) return bad("Request not found", 404);
    return ok(rec);
  } catch (err: any) {
    console.error("[attendance-requests GET id]", err);
    return bad("Failed to fetch request: " + (err?.message || String(err)), 500);
  }
}

// PATCH /api/attendance-requests/[id] — approve / reject / cancel / update
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const body = await parseBody(req);

    const existing = await db.attendanceRequest.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Request not found", 404);

    const action = String(body.action || ""); // approve | reject | cancel | withdraw | forward
    const comment = body.comment ? String(body.comment) : null;
    const approverName = body.approverName ? String(body.approverName) : "Approver";
    const approverType = body.approverType ? String(body.approverType) : "ReportingManager";

    let newStatus = existing.status;

    if (action === "approve") {
      // Find the current pending approval step
      const pendingStep = await db.attendanceRequestApproval.findFirst({
        where: { requestId: id, action: "Pending" },
        orderBy: { stepOrder: "asc" },
      });
      if (pendingStep) {
        await db.attendanceRequestApproval.update({
          where: { id: pendingStep.id },
          data: {
            action: "Approved",
            comment,
            approverName,
            actedAt: new Date(),
          },
        });
        // Check if there's a next step
        const nextStep = await db.attendanceRequestApproval.findFirst({
          where: { requestId: id, action: "Pending" },
          orderBy: { stepOrder: "asc" },
        });
        if (nextStep) {
          newStatus = "PendingApproval";
        } else {
          newStatus = "Approved";
          // If it's a regularization, apply to attendance
          if (existing.requestType === "Regularization" || existing.requestType === "Correction" || existing.requestType === "MissingPunch") {
            await applyRegularizationToAttendance(existing, body);
          }
        }
      }
    } else if (action === "reject") {
      newStatus = "Rejected";
      await db.attendanceRequestApproval.updateMany({
        where: { requestId: id, action: "Pending" },
        data: { action: "Rejected", comment, approverName, actedAt: new Date() },
      });
    } else if (action === "cancel" || action === "withdraw") {
      newStatus = action === "cancel" ? "Cancelled" : "Withdrawn";
    } else if (body.status) {
      newStatus = String(body.status);
    }

    const updated = await db.attendanceRequest.update({
      where: { id },
      data: {
        status: newStatus,
        decisionAt: ["Approved", "Rejected", "Cancelled", "Withdrawn"].includes(newStatus) ? new Date() : null,
        decisionBy: ["Approved", "Rejected", "Cancelled", "Withdrawn"].includes(newStatus) ? approverName : null,
        decisionComment: comment,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true } },
        approvals: { orderBy: { stepOrder: "asc" } },
      },
    });

    // Audit log
    await db.attendanceAuditLog.create({
      data: {
        tenantId,
        employeeId: existing.employeeId,
        module: "Attendance",
        action: `Request${newStatus}`,
        referenceType: "AttendanceRequest",
        referenceId: id,
        oldValue: JSON.stringify({ status: existing.status }),
        newValue: JSON.stringify({ status: newStatus }),
        performedBy: approverName,
        reason: comment,
      },
    });

    return ok(updated);
  } catch (err: any) {
    console.error("[attendance-requests PATCH id]", err);
    return bad("Failed to update request: " + (err?.message || String(err)), 500);
  }
}

// Apply a regularization request to the attendance record
async function applyRegularizationToAttendance(req: any, body: any) {
  const date = new Date(req.attendanceDate);
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);

  const existing = await db.attendance.findFirst({
    where: { employeeId: req.employeeId, date: { gte: start, lte: end } },
  });

  const newStatus = req.requestedStatus || "Present";
  const clockIn = req.requestedFirstIn ? new Date(req.requestedFirstIn) : (existing?.clockIn || null);
  const clockOut = req.requestedLastOut ? new Date(req.requestedLastOut) : (existing?.clockOut || null);

  // Calculate work hours
  let workHours = 0;
  if (clockIn && clockOut) {
    workHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  }

  if (existing) {
    await db.attendance.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        clockIn,
        clockOut,
        firstIn: clockIn,
        lastOut: clockOut,
        workHours,
        regularizationStatus: "Approved",
        approvalStatus: "Approved",
        source: "Regularization",
        remarks: req.reason || existing.remarks,
      },
    });
  } else {
    await db.attendance.create({
      data: {
        tenantId: req.tenantId,
        employeeId: req.employeeId,
        date,
        clockIn,
        clockOut,
        firstIn: clockIn,
        lastOut: clockOut,
        status: newStatus,
        workHours,
        regularizationStatus: "Approved",
        approvalStatus: "Approved",
        source: "Regularization",
        remarks: req.reason,
        requestId: req.id,
      },
    });
  }
}
