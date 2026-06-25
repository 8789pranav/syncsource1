import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  ensureTenant,
  ok,
  created,
  bad,
  parseBody,
  listResponse,
} from "@/lib/api-helpers";
import {
  toBool,
  toNum,
  toStr,
  toDate,
  inclusiveDays,
  eachDay,
  isoDate,
  toStrNN,
  csvToList,
  listToCsv,
  writeLedger,
  adjustBalance,
  upsertBalance,
  writeAudit,
  resolveApprover,
  computeAvailable,
} from "@/lib/leave-helpers";

// GET /api/leave-applications?employeeId=&status=&leaveTypeId=&fromDate=&toDate=&managerId=&departmentId=
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const sp = req.nextUrl.searchParams;
  const employeeId = sp.get("employeeId");
  const status = sp.get("status");
  const leaveTypeId = sp.get("leaveTypeId");
  const fromDate = sp.get("fromDate");
  const toDateParam = sp.get("toDate");
  const managerId = sp.get("managerId");
  const departmentId = sp.get("departmentId");

  // Build "where" carefully — managerId means: applications whose employee.reportingManagerId = managerId.
  const employeeWhere: any = { tenantId };
  if (managerId) employeeWhere.reportingManagerId = managerId;
  if (departmentId) employeeWhere.departmentId = departmentId;

  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (employeeId) {
    // Direct employee filter — don't apply employee relation conditions.
  } else if (managerId || departmentId) {
    where.employee = employeeWhere;
  }
  if (fromDate || toDateParam) {
    where.fromDate = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDateParam ? { lte: new Date(toDateParam) } : {}),
    };
  }

  const items = await db.leaveApplication.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          displayName: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          reportingManagerId: true,
        },
      },
      approvals: { orderBy: { stepOrder: "asc" } },
      days_log: { orderBy: { date: "asc" } },
    },
    orderBy: { appliedAt: "desc" },
  });
  return listResponse(items);
}

// POST /api/leave-applications — apply leave with full workflow + ledger + audit.
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);

    const employeeId = toStrNN(body.employeeId).trim();
    const leaveTypeId = toStrNN(body.leaveTypeId).trim();
    const fromRaw = toStr(body.fromDate);
    const toRaw = toStr(body.toDate);
    if (!employeeId) return bad("employeeId is required");
    if (!leaveTypeId) return bad("leaveTypeId is required");
    if (!fromRaw || !toRaw) return bad("fromDate and toDate are required");

    const fromDate = toDate(fromRaw);
    const toDateVal = toDate(toRaw);
    if (!fromDate || !toDateVal) return bad("Invalid fromDate / toDate");
    if (toDateVal < fromDate) return bad("toDate cannot be before fromDate");

    const [employee, leaveType] = await Promise.all([
      db.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          reportingManagerId: true,
          departmentId: true,
        },
      }),
      db.leaveType.findFirst({ where: { id: leaveTypeId, tenantId } }),
    ]);
    if (!employee) return bad("Employee not found", 404);
    if (!leaveType) return bad("Leave type not found", 404);

    const halfDay = toBool(body.halfDay, false);
    const halfDayType = halfDay ? toStr(body.halfDayType, "FirstHalf") : null;
    const hours = toNum(body.hours, null);
    const leaveUnit = leaveType.leaveUnit;

    // Compute days
    let days: number;
    if (hours && (leaveUnit === "Hourly" || leaveUnit === "Mixed")) {
      days = Math.round((hours / 8) * 100) / 100; // 8 hours = 1 day
      if (halfDay) days = Math.min(days, 0.5);
    } else if (halfDay) {
      days = 0.5;
    } else {
      days = inclusiveDays(fromDate, toDateVal);
    }

    if (days <= 0) return bad("days must be greater than zero");

    // Pre-fetch holidays + weekly-offs in the range for day-level logging.
    const holidays = await db.holiday.findMany({
      where: {
        tenantId,
        date: { gte: fromDate, lte: toDateVal },
      },
      select: { date: true, name: true },
    });
    const holidaySet = new Set(holidays.map((h) => isoDate(h.date)));
    const weeklyOffs = await db.weeklyOffCalendar.findMany({
      where: { tenantId, status: "Active" },
      select: { fixedDays: true },
    });
    const weeklyOffSet = new Set<number>();
    for (const w of weeklyOffs) {
      const days = csvToList(w.fixedDays) || [];
      for (const d of days) {
        const n = Number(d);
        if (Number.isFinite(n)) weeklyOffSet.add(n);
      }
    }

    // Find an active workflow for the leave module.
    const workflow = await db.workflow.findFirst({
      where: { tenantId, module: "leave", isActive: true },
      include: { steps: { orderBy: { level: "asc" } } },
    });

    const result = await db.$transaction(async (tx) => {
      // 1. Create the application.
      const application = await tx.leaveApplication.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId,
          leavePolicyItemId: toStr(body.leavePolicyItemId),
          fromDate,
          toDate: toDateVal,
          days,
          halfDay,
          halfDayType,
          hours: hours || null,
          reason: toStr(body.reason),
          attachmentUrl: toStr(body.attachmentUrl),
          attachmentName: toStr(body.attachmentName),
          emergencyContact: toStr(body.emergencyContact),
          backupPersonId: toStr(body.backupPersonId),
          handoverNotes: toStr(body.handoverNotes),
          notifyTeamMemberIds: listToCsv(csvToList(body.notifyTeamMemberIds)),
          addressDuringLeave: toStr(body.addressDuringLeave),
          contactDuringLeave: toStr(body.contactDuringLeave),
          extraFieldsJson: toStr(body.extraFieldsJson),
          status: workflow ? "Pending" : "AutoApproved",
        },
      });

      // 2. Per-day log entries.
      const daysIn = eachDay(fromDate, toDateVal);
      for (const d of daysIn) {
        const isHol = holidaySet.has(isoDate(d));
        const isWO = weeklyOffSet.has(d.getDay());
        let dayType = "FullDay";
        if (halfDay) dayType = halfDayType || "FirstHalf";
        await tx.leaveApplicationDay.create({
          data: {
            applicationId: application.id,
            date: d,
            dayType,
            hours: hours || null,
            isHoliday: isHol,
            isWeeklyOff: isWO,
            counted: !(isHol || isWO) || leaveType.sandwichRule,
          },
        });
      }

      // 3. Workflow + approvals + ledger + balance + audit.
      if (!workflow) {
        // Auto-approve path.
        await tx.leaveApplication.update({
          where: { id: application.id },
          data: {
            status: "AutoApproved",
            decisionAt: new Date(),
            decisionBy: "system",
            decisionComment: "Auto-approved (no leave workflow configured)",
          },
        });
        // Ledger: LeaveApproved (debit) + balance.used += days
        await writeLedger(tx, {
          tenantId,
          employeeId,
          leaveTypeId,
          transactionType: "LeaveApproved",
          debit: days,
          referenceType: "LeaveApplication",
          referenceId: application.id,
          applicationId: application.id,
          remarks: `Auto-approved leave (${days} day(s))`,
          createdBy: "system",
        });
        await adjustBalance(tx, {
          tenantId,
          employeeId,
          leaveTypeId,
          year: fromDate.getFullYear(),
          field: "used",
          delta: days,
        });
        await writeAudit(tx, {
          tenantId,
          employeeId,
          action: "LeaveApproved",
          referenceType: "LeaveApplication",
          referenceId: application.id,
          newValue: JSON.stringify({ status: "AutoApproved", days }),
          performedBy: "system",
        });
        return tx.leaveApplication.findUnique({
          where: { id: application.id },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                displayName: true,
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
                reportingManagerId: true,
              },
            },
            leaveType: true,
            approvals: { orderBy: { stepOrder: "asc" } },
            days_log: { orderBy: { date: "asc" } },
            ledgerEntries: { orderBy: { createdAt: "desc" } },
          },
        });
      }

      // Workflow exists — create instance + LeaveApproval rows.
      const instance = await tx.workflowInstance.create({
        data: {
          tenantId,
          workflowId: workflow.id,
          module: "leave",
          recordId: application.id,
          initiatorId: employeeId,
          status: "Pending",
          currentLevel: 1,
        },
      });

      const steps = workflow.steps;
      let firstApproverId: string | null = null;
      let firstApproverName: string | null = null;
      for (const step of steps) {
        const resolved =
          step.approverType === "SpecificEmployee"
            ? { approverId: step.approverId, approverName: null }
            : await resolveApprover(tx, {
                tenantId,
                step: {
                  approverType: step.approverType,
                  approverId: step.approverId,
                  approverRole: step.approverRole,
                },
                employeeId,
              });
        await tx.leaveApproval.create({
          data: {
            applicationId: application.id,
            stepOrder: step.level,
            approverType: step.approverType,
            approverId: resolved.approverId,
            approverName: resolved.approverName,
            action: "Pending",
          },
        });
        if (step.level === 1) {
          firstApproverId = resolved.approverId;
          firstApproverName = resolved.approverName;
        }
      }

      await tx.leaveApplication.update({
        where: { id: application.id },
        data: {
          workflowInstanceId: instance.id,
          currentApproverId: firstApproverId,
        },
      });

      // Ledger: LeaveApplied (debit) + balance.pending += days
      await writeLedger(tx, {
        tenantId,
        employeeId,
        leaveTypeId,
        transactionType: "LeaveApplied",
        debit: days,
        referenceType: "LeaveApplication",
        referenceId: application.id,
        applicationId: application.id,
        remarks: `Leave applied (${days} day(s))`,
        createdBy: employeeId,
      });
      await adjustBalance(tx, {
        tenantId,
        employeeId,
        leaveTypeId,
        year: fromDate.getFullYear(),
        field: "pending",
        delta: days,
      });

      await writeAudit(tx, {
        tenantId,
        employeeId,
        action: "LeaveApplied",
        referenceType: "LeaveApplication",
        referenceId: application.id,
        newValue: JSON.stringify({ days, leaveTypeId, fromDate, toDate: toDateVal, status: "Pending" }),
        performedBy: employeeId,
      });

      return tx.leaveApplication.findUnique({
        where: { id: application.id },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              displayName: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, name: true } },
              reportingManagerId: true,
            },
          },
          leaveType: true,
          approvals: { orderBy: { stepOrder: "asc" } },
          days_log: { orderBy: { date: "asc" } },
          ledgerEntries: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    return created(result);
  } catch (err: any) {
    console.error("[leave-applications POST]", err);
    return bad("Failed to apply leave: " + (err?.message || String(err)), 500);
  }
}
