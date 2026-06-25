import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

// GET /api/attendance-requests?type=&status=&employeeId=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type");
    const status = sp.get("status");
    const employeeId = sp.get("employeeId");
    const from = sp.get("from");
    const to = sp.get("to");

    const where: any = { tenantId };
    if (type) where.requestType = type;
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate.gte = new Date(from);
      if (to) where.attendanceDate.lte = new Date(to);
    }

    const items = await db.attendanceRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true, displayName: true,
            department: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            entity: { select: { id: true, legalName: true, tradeName: true } },
          },
        },
        approvals: { orderBy: { stepOrder: "asc" } },
      },
      orderBy: { appliedAt: "desc" },
    });
    return listResponse(items);
  } catch (err: any) {
    console.error("[attendance-requests GET]", err);
    return bad("Failed to load requests: " + (err?.message || String(err)), 500);
  }
}

// POST /api/attendance-requests — create a new request
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const employeeId = String(body.employeeId || "");
    const requestType = String(body.requestType || "");
    if (!employeeId || !requestType) return bad("employeeId and requestType are required");

    const attendanceDate = body.attendanceDate ? new Date(body.attendanceDate) : new Date();

    const rec = await db.attendanceRequest.create({
      data: {
        tenantId,
        employeeId,
        requestType,
        attendanceDate,
        fromDate: body.fromDate ? new Date(body.fromDate) : null,
        toDate: body.toDate ? new Date(body.toDate) : null,
        fromTime: body.fromTime || null,
        toTime: body.toTime || null,
        duration: Number(body.duration) || 0,
        currentStatus: body.currentStatus || null,
        requestedStatus: body.requestedStatus || null,
        currentFirstIn: body.currentFirstIn ? new Date(body.currentFirstIn) : null,
        currentLastOut: body.currentLastOut ? new Date(body.currentLastOut) : null,
        requestedFirstIn: body.requestedFirstIn ? new Date(body.requestedFirstIn) : null,
        requestedLastOut: body.requestedLastOut ? new Date(body.requestedLastOut) : null,
        reason: body.reason || null,
        attachmentUrl: body.attachmentUrl || null,
        attachmentName: body.attachmentName || null,
        workLocation: body.workLocation || null,
        clientSiteName: body.clientSiteName || null,
        purpose: body.purpose || null,
        permissionType: body.permissionType || null,
        notifyTo: body.notifyTo || null,
        extraFieldsJson: body.extraFieldsJson ? JSON.stringify(body.extraFieldsJson) : null,
        status: "PendingApproval",
        currentApproverId: body.currentApproverId || null,
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } },
      },
    });

    // Create initial approval step (Reporting Manager → HR)
    await db.attendanceRequestApproval.create({
      data: {
        requestId: rec.id,
        stepOrder: 1,
        approverType: "ReportingManager",
        action: "Pending",
      },
    });
    await db.attendanceRequestApproval.create({
      data: {
        requestId: rec.id,
        stepOrder: 2,
        approverType: "HR",
        action: "Pending",
      },
    });

    // Audit log
    await db.attendanceAuditLog.create({
      data: {
        tenantId,
        employeeId,
        module: "Attendance",
        action: "RequestSubmitted",
        referenceType: "AttendanceRequest",
        referenceId: rec.id,
        newValue: JSON.stringify({ requestType, status: "PendingApproval" }),
        performedBy: body.performedBy || "Employee",
        reason: body.reason || null,
      },
    });

    return created(rec);
  } catch (err: any) {
    console.error("[attendance-requests POST]", err);
    return bad("Failed to create request: " + (err?.message || String(err)), 500);
  }
}
