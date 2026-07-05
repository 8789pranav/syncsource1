import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";
import {
  toStr,
  toDate,
  toNum,
  writeLedger,
  adjustBalance,
  writeAudit,
  resolveApprover,
  computeAvailable,
} from "@/lib/leave-helpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/leave-applications/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const rec = await db.leaveApplication.findFirst({
      where: { id, tenantId },
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
        leaveType: true,
        approvals: {
          orderBy: { stepOrder: "asc" },
        },
        days_log: { orderBy: { date: "asc" } },
        ledgerEntries: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!rec) return bad("Leave application not found", 404);

    // Enrich approvals with approver employee details.
    const approverIds = (rec.approvals || [])
      .map((a: any) => a.approverId)
      .filter(Boolean) as string[];
    let approverMap: Record<string, any> = {};
    if (approverIds.length) {
      const approvers = await db.employee.findMany({
        where: { id: { in: approverIds } },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          displayName: true,
        },
      });
      approverMap = Object.fromEntries(approvers.map((a) => [a.id, a]));
    }
    const approvals = rec.approvals.map((a: any) => ({
      ...a,
      approver: a.approverId ? approverMap[a.approverId] || null : null,
    }));

    return ok({ ...rec, approvals });
  } catch (err: any) {
    console.error("[leave-applications GET id]", err);
    return bad("Failed to fetch leave application: " + (err?.message || String(err)), 500);
  }
}

// PATCH /api/leave-applications/[id]
// Body: { action: "Approve" | "Reject" | "SendBack" | "Withdraw" | "Cancel", comment?, approvedFromDate?, approvedToDate?, actorId? }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const body = await parseBody(req);
    const action = toStr(body.action, "")!.trim();
    if (!action) return bad("action is required");
    const validActions = ["Approve", "Reject", "SendBack", "Withdraw", "Cancel"];
    if (!validActions.includes(action)) {
      return bad(`Invalid action. Allowed: ${validActions.join(", ")}`);
    }

    const comment = toStr(body.comment);
    // toStr returns `string | null`; coerce to `string` for the per-action helpers
    // which require a non-null actorId.
    const actorId = toStr(body.actorId, "hr-admin") ?? "hr-admin";
    const approvedFromDate = toDate(body.approvedFromDate);
    const approvedToDate = toDate(body.approvedToDate);

    const existing = await db.leaveApplication.findFirst({
      where: { id, tenantId },
      include: {
        approvals: { orderBy: { stepOrder: "asc" } },
      },
    });
    if (!existing) return bad("Leave application not found", 404);

    // Fetch workflow instance separately (LeaveApplication has only a string FK,
    // not a Prisma relation — so we can't `include` it directly).
    let wfInstance: any = null;
    if (existing.workflowInstanceId) {
      wfInstance = await db.workflowInstance.findFirst({
        where: { id: existing.workflowInstanceId },
        include: { workflow: { include: { steps: { orderBy: { level: "asc" } } } } },
      });
    }
    (existing as any).workflowInstance = wfInstance;

    const days = existing.days;
    const year = existing.fromDate.getFullYear();

    const result = await db.$transaction(async (tx) => {
      if (action === "Approve") {
        return await approveApplication(tx, existing, comment, actorId, approvedFromDate, approvedToDate);
      }
      if (action === "Reject") {
        return await rejectApplication(tx, existing, comment, actorId);
      }
      if (action === "SendBack") {
        return await sendBackApplication(tx, existing, comment, actorId);
      }
      // Withdraw or Cancel — `action` is validated against validActions above
      // and the three preceding branches handle Approve/Reject/SendBack, so
      // here it can only be "Withdraw" | "Cancel".
      return await withdrawOrCancel(tx, existing, action as "Withdraw" | "Cancel", comment, actorId);
    });

    return ok(result);
  } catch (err: any) {
    console.error("[leave-applications PATCH id]", err);
    return bad("Failed to update leave application: " + (err?.message || String(err)), 500);
  }
}

// ----- per-action helpers (each runs inside the parent transaction) -----

async function approveApplication(
  tx: any,
  existing: any,
  comment: string | null,
  actorId: string,
  approvedFromDate: Date | null,
  approvedToDate: Date | null
) {
  const tenantId = existing.tenantId;
  const days = existing.days;
  const year = existing.fromDate.getFullYear();

  // Mark current pending approval as approved.
  const currentApproval = existing.approvals.find(
    (a: any) => a.action === "Pending" && a.stepOrder === (existing.workflowInstance?.currentLevel || 1)
  );
  if (currentApproval) {
    await tx.leaveApproval.update({
      where: { id: currentApproval.id },
      data: { action: "Approve", comment, actedAt: new Date() },
    });
  }

  const wfInstance = existing.workflowInstance;
  const steps = wfInstance?.workflow?.steps || [];
  const currentLevel = wfInstance?.currentLevel || 1;
  const nextStep = steps.find((s: any) => s.level > currentLevel);

  if (wfInstance && nextStep) {
    // Advance to next step.
    const next = await resolveApprover(tx, {
      tenantId,
      step: {
        approverType: nextStep.approverType,
        approverId: nextStep.approverId,
        approverRole: nextStep.approverRole,
      },
      employeeId: existing.employeeId,
    });
    await tx.workflowInstance.update({
      where: { id: wfInstance.id },
      data: { currentLevel: nextStep.level },
    });
    await tx.leaveApplication.update({
      where: { id: existing.id },
      data: {
        status: nextStep.approverType === "HRManager" ? "PendingHR" : "Pending",
        currentApproverId: next.approverId,
      },
    });
    await writeAudit(tx, {
      tenantId,
      employeeId: existing.employeeId,
      action: "LeaveApproved",
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      newValue: JSON.stringify({ step: currentLevel, status: "Pending (advanced)" }),
      performedBy: actorId,
      reason: comment,
    });
  } else {
    // Last step (or no workflow instance) — finalize.
    if (wfInstance) {
      await tx.workflowInstance.update({
        where: { id: wfInstance.id },
        data: { status: "Approved", currentLevel: steps.length || 1, completedAt: new Date() },
      });
    }
    const approvedDays =
      approvedFromDate && approvedToDate
        ? Math.max(0.5, Math.floor((approvedToDate.getTime() - approvedFromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1)
        : days;
    await tx.leaveApplication.update({
      where: { id: existing.id },
      data: {
        status: "Approved",
        decisionAt: new Date(),
        decisionBy: actorId,
        decisionComment: comment,
        currentApproverId: null,
        approvedFromDate: approvedFromDate || existing.fromDate,
        approvedToDate: approvedToDate || existing.toDate,
        approvedDays,
      },
    });
    // Ledger: LeaveApproved (debit) + move balance pending → used
    await writeLedger(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      transactionType: "LeaveApproved",
      debit: days,
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      applicationId: existing.id,
      remarks: `Leave approved (${days} day(s))`,
      createdBy: actorId,
    });
    await adjustBalance(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      year,
      field: "pending",
      delta: -days,
    });
    await adjustBalance(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      year,
      field: "used",
      delta: days,
    });
    await writeAudit(tx, {
      tenantId,
      employeeId: existing.employeeId,
      action: "LeaveApproved",
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      newValue: JSON.stringify({ status: "Approved", days }),
      performedBy: actorId,
      reason: comment,
    });
  }

  return fetchWithIncludes(tx, existing.id);
}

async function rejectApplication(
  tx: any,
  existing: any,
  comment: string | null,
  actorId: string
) {
  const tenantId = existing.tenantId;
  const days = existing.days;
  const year = existing.fromDate.getFullYear();

  // Mark all pending approvals as rejected.
  for (const a of existing.approvals) {
    if (a.action === "Pending") {
      await tx.leaveApproval.update({
        where: { id: a.id },
        data: { action: "Reject", comment, actedAt: new Date() },
      });
    }
  }

  if (existing.workflowInstance) {
    await tx.workflowInstance.update({
      where: { id: existing.workflowInstance.id },
      data: { status: "Rejected", completedAt: new Date() },
    });
  }

  await tx.leaveApplication.update({
    where: { id: existing.id },
    data: {
      status: "Rejected",
      decisionAt: new Date(),
      decisionBy: actorId,
      decisionComment: comment,
      currentApproverId: null,
    },
  });

  // Reverse the LeaveApplied ledger effect ONLY if it was pending (not yet approved).
  // Best-effort: credit back pending amount.
  if (existing.status === "Pending" || existing.status === "PendingHR") {
    await writeLedger(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      transactionType: "LeaveRejected",
      credit: days,
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      applicationId: existing.id,
      remarks: `Leave rejected (${days} day(s) reversed)`,
      createdBy: actorId,
    });
    await adjustBalance(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      year,
      field: "pending",
      delta: -days,
    });
  } else if (existing.status === "Approved" || existing.status === "AutoApproved") {
    // Reverse used amount.
    await writeLedger(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      transactionType: "LeaveRejected",
      credit: days,
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      applicationId: existing.id,
      remarks: `Approved leave reversed (${days} day(s))`,
      createdBy: actorId,
    });
    await adjustBalance(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      year,
      field: "used",
      delta: -days,
    });
  }

  await writeAudit(tx, {
    tenantId,
    employeeId: existing.employeeId,
    action: "LeaveRejected",
    referenceType: "LeaveApplication",
    referenceId: existing.id,
    newValue: JSON.stringify({ status: "Rejected" }),
    performedBy: actorId,
    reason: comment,
  });

  return fetchWithIncludes(tx, existing.id);
}

async function sendBackApplication(
  tx: any,
  existing: any,
  comment: string | null,
  actorId: string
) {
  const tenantId = existing.tenantId;
  // Mark current pending approval as "SendBack"
  const currentApproval = existing.approvals.find(
    (a: any) => a.action === "Pending" && a.stepOrder === (existing.workflowInstance?.currentLevel || 1)
  );
  if (currentApproval) {
    await tx.leaveApproval.update({
      where: { id: currentApproval.id },
      data: { action: "SendBack", comment, actedAt: new Date() },
    });
  }
  // Send back to previous step (or applicant if at level 1).
  const wfInstance = existing.workflowInstance;
  const steps = wfInstance?.workflow?.steps || [];
  const currentLevel = wfInstance?.currentLevel || 1;
  const prevStep = [...steps].reverse().find((s: any) => s.level < currentLevel);
  if (wfInstance && prevStep) {
    const prev = await resolveApprover(tx, {
      tenantId,
      step: {
        approverType: prevStep.approverType,
        approverId: prevStep.approverId,
        approverRole: prevStep.approverRole,
      },
      employeeId: existing.employeeId,
    });
    await tx.workflowInstance.update({
      where: { id: wfInstance.id },
      data: { currentLevel: prevStep.level },
    });
    await tx.leaveApplication.update({
      where: { id: existing.id },
      data: { status: "Pending", currentApproverId: prev.approverId },
    });
  } else {
    // Back to applicant — leave pending balance as-is.
    await tx.leaveApplication.update({
      where: { id: existing.id },
      data: { status: "Pending", currentApproverId: existing.employeeId },
    });
  }
  await writeAudit(tx, {
    tenantId,
    employeeId: existing.employeeId,
    action: "LeaveSentBack",
    referenceType: "LeaveApplication",
    referenceId: existing.id,
    newValue: JSON.stringify({ status: "Pending (sent back)" }),
    performedBy: actorId,
    reason: comment,
  });
  return fetchWithIncludes(tx, existing.id);
}

async function withdrawOrCancel(
  tx: any,
  existing: any,
  action: "Withdraw" | "Cancel",
  comment: string | null,
  actorId: string
) {
  const tenantId = existing.tenantId;
  const days = existing.days;
  const year = existing.fromDate.getFullYear();
  const newStatus = action === "Withdraw" ? "Withdrawn" : "Cancelled";

  // Mark pending approvals as cancelled.
  for (const a of existing.approvals) {
    if (a.action === "Pending") {
      await tx.leaveApproval.update({
        where: { id: a.id },
        data: { action: "Delegate", comment: `${action} by ${actorId}`, actedAt: new Date() },
      });
    }
  }
  if (existing.workflowInstance) {
    await tx.workflowInstance.update({
      where: { id: existing.workflowInstance.id },
      data: { status: "Cancelled", completedAt: new Date() },
    });
  }
  await tx.leaveApplication.update({
    where: { id: existing.id },
    data: {
      status: newStatus,
      decisionAt: new Date(),
      decisionBy: actorId,
      decisionComment: comment,
      currentApproverId: null,
    },
  });

  // Reverse the ledger effect.
  if (existing.status === "Pending" || existing.status === "PendingHR") {
    await writeLedger(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      transactionType: action === "Withdraw" ? "LeaveCancelled" : "LeaveCancelled",
      credit: days,
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      applicationId: existing.id,
      remarks: `${action}: ${days} day(s) reversed`,
      createdBy: actorId,
    });
    await adjustBalance(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      year,
      field: "pending",
      delta: -days,
    });
  } else if (existing.status === "Approved" || existing.status === "AutoApproved") {
    await writeLedger(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      transactionType: "LeaveCancelled",
      credit: days,
      referenceType: "LeaveApplication",
      referenceId: existing.id,
      applicationId: existing.id,
      remarks: `${action}: ${days} day(s) reversed`,
      createdBy: actorId,
    });
    await adjustBalance(tx, {
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: existing.leaveTypeId,
      year,
      field: "used",
      delta: -days,
    });
  }

  await writeAudit(tx, {
    tenantId,
    employeeId: existing.employeeId,
    action: action === "Withdraw" ? "LeaveWithdrawn" : "LeaveCancelled",
    referenceType: "LeaveApplication",
    referenceId: existing.id,
    newValue: JSON.stringify({ status: newStatus }),
    performedBy: actorId,
    reason: comment,
  });

  return fetchWithIncludes(tx, existing.id);
}

async function fetchWithIncludes(tx: any, id: string) {
  return tx.leaveApplication.findUnique({
    where: { id },
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

// Used by recalc balance route to coerce amounts. Re-exported for reuse.
export { computeAvailable, toNum };
