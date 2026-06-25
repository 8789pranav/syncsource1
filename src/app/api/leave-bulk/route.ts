import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  ensureTenant,
  ok,
  bad,
  parseBody,
} from "@/lib/api-helpers";
import {
  toStr,
  toNum,
  writeLedger,
  writeAudit,
  adjustBalance,
  computeAvailable,
  listToCsv,
} from "@/lib/leave-helpers";

// POST /api/leave-bulk
// Body: { action: "approve"|"reject"|"cancel"|"adjustBalance"|"assignPolicy"|"carryForward"|"encash",
//         ids: [...], payload?, reason?, actorId? }
// Cap 500 ids per call. Per-item transaction (partial success allowed).
export async function POST(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const action = toStr(body.action, "")!.trim();
    if (!action) return bad("action is required");

    const validActions = ["approve", "reject", "cancel", "adjustBalance", "assignPolicy", "carryForward", "encash"];
    if (!validActions.includes(action)) {
      return bad(`Invalid action. Allowed: ${validActions.join(", ")}`);
    }

    const idsRaw = Array.isArray(body.ids) ? body.ids : [];
    if (!idsRaw.length) return bad("ids[] is required");
    const ids = idsRaw.map((x: any) => String(x)).slice(0, 500); // cap
    const reason = toStr(body.reason);
    const actorId = toStr(body.actorId, "hr-admin")!;
    const payload = body.payload || {};

    let updated = 0;
    const errors: { id: string; error: string }[] = [];

    if (action === "approve" || action === "reject" || action === "cancel") {
      // Loop applications; reuse the same PATCH semantics as
      // /api/leave-applications/[id] (Approve/Reject/Withdraw-Cancel).
      for (const id of ids) {
        try {
          await db.$transaction(async (tx) => {
            const existing = await tx.leaveApplication.findFirst({
              where: { id, tenantId },
              include: {
                approvals: { orderBy: { stepOrder: "asc" } },
              },
            });
            if (!existing) throw new Error("Leave application not found");

            // LeaveApplication has only a plain `workflowInstanceId` FK (no
            // Prisma relation named `workflowInstance`), so fetch the instance
            // separately when present.
            let wfInstance: any = null;
            if (existing.workflowInstanceId) {
              wfInstance = await tx.workflowInstance.findFirst({
                where: { id: existing.workflowInstanceId },
                include: { workflow: { include: { steps: { orderBy: { level: "asc" } } } } },
              });
            }

            const days = existing.days;
            const year = existing.fromDate.getFullYear();
            const verb = action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Cancel";

            if (verb === "Approve") {
              const currentApproval = existing.approvals.find(
                (a: any) => a.action === "Pending" && a.stepOrder === (wfInstance?.currentLevel || 1),
              );
              if (currentApproval) {
                await tx.leaveApproval.update({
                  where: { id: currentApproval.id },
                  data: { action: "Approve", comment: reason, actedAt: new Date() },
                });
              }
              const steps = wfInstance?.workflow?.steps || [];
              const currentLevel = wfInstance?.currentLevel || 1;
              const nextStep = steps.find((s: any) => s.level > currentLevel);
              if (nextStep && wfInstance) {
                await tx.workflowInstance.update({
                  where: { id: wfInstance.id },
                  data: { currentLevel: nextStep.level },
                });
                await tx.leaveApplication.update({
                  where: { id: existing.id },
                  data: { status: "PendingHR" },
                });
              } else {
                if (wfInstance) {
                  await tx.workflowInstance.update({
                    where: { id: wfInstance.id },
                    data: { status: "Approved", completedAt: new Date() },
                  });
                }
                await tx.leaveApplication.update({
                  where: { id: existing.id },
                  data: {
                    status: "Approved",
                    decisionAt: new Date(),
                    decisionBy: actorId,
                    decisionComment: reason,
                    currentApproverId: null,
                  },
                });
                // Move pending → used (only if there was a pending debit).
                if (existing.status === "Pending" || existing.status === "PendingHR") {
                  await writeLedger(tx, {
                    tenantId,
                    employeeId: existing.employeeId,
                    leaveTypeId: existing.leaveTypeId,
                    transactionType: "LeaveApproved",
                    debit: days,
                    referenceType: "LeaveApplication",
                    referenceId: existing.id,
                    applicationId: existing.id,
                    remarks: `Bulk approved (${days} day(s))`,
                    createdBy: actorId,
                  });
                  await adjustBalance(tx, {
                    tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year,
                    field: "pending", delta: -days,
                  });
                  await adjustBalance(tx, {
                    tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year,
                    field: "used", delta: days,
                  });
                }
              }
            } else if (verb === "Reject") {
              for (const a of existing.approvals) {
                if (a.action === "Pending") {
                  await tx.leaveApproval.update({
                    where: { id: a.id },
                    data: { action: "Reject", comment: reason, actedAt: new Date() },
                  });
                }
              }
              if (wfInstance) {
                await tx.workflowInstance.update({
                  where: { id: wfInstance.id },
                  data: { status: "Rejected", completedAt: new Date() },
                });
              }
              await tx.leaveApplication.update({
                where: { id: existing.id },
                data: {
                  status: "Rejected",
                  decisionAt: new Date(),
                  decisionBy: actorId,
                  decisionComment: reason,
                  currentApproverId: null,
                },
              });
              // Reverse ledger.
              if (existing.status === "Pending" || existing.status === "PendingHR") {
                await writeLedger(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId,
                  transactionType: "LeaveRejected", credit: days,
                  referenceType: "LeaveApplication", referenceId: existing.id, applicationId: existing.id,
                  remarks: `Bulk rejected (${days} day(s) reversed)`, createdBy: actorId,
                });
                await adjustBalance(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year,
                  field: "pending", delta: -days,
                });
              } else if (existing.status === "Approved" || existing.status === "AutoApproved") {
                await writeLedger(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId,
                  transactionType: "LeaveRejected", credit: days,
                  referenceType: "LeaveApplication", referenceId: existing.id, applicationId: existing.id,
                  remarks: `Bulk rejected (${days} day(s) reversed)`, createdBy: actorId,
                });
                await adjustBalance(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year,
                  field: "used", delta: -days,
                });
              }
            } else {
              // Cancel
              for (const a of existing.approvals) {
                if (a.action === "Pending") {
                  await tx.leaveApproval.update({
                    where: { id: a.id },
                    data: { action: "Delegate", comment: `Cancel by ${actorId}`, actedAt: new Date() },
                  });
                }
              }
              if (wfInstance) {
                await tx.workflowInstance.update({
                  where: { id: wfInstance.id },
                  data: { status: "Cancelled", completedAt: new Date() },
                });
              }
              await tx.leaveApplication.update({
                where: { id: existing.id },
                data: {
                  status: "Cancelled",
                  decisionAt: new Date(),
                  decisionBy: actorId,
                  decisionComment: reason,
                  currentApproverId: null,
                },
              });
              if (existing.status === "Pending" || existing.status === "PendingHR") {
                await writeLedger(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId,
                  transactionType: "LeaveCancelled", credit: days,
                  referenceType: "LeaveApplication", referenceId: existing.id, applicationId: existing.id,
                  remarks: `Bulk cancel (${days} day(s) reversed)`, createdBy: actorId,
                });
                await adjustBalance(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year,
                  field: "pending", delta: -days,
                });
              } else if (existing.status === "Approved" || existing.status === "AutoApproved") {
                await writeLedger(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId,
                  transactionType: "LeaveCancelled", credit: days,
                  referenceType: "LeaveApplication", referenceId: existing.id, applicationId: existing.id,
                  remarks: `Bulk cancel (${days} day(s) reversed)`, createdBy: actorId,
                });
                await adjustBalance(tx, {
                  tenantId, employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year,
                  field: "used", delta: -days,
                });
              }
            }

            await writeAudit(tx, {
              tenantId, employeeId: existing.employeeId,
              action: verb === "Approve" ? "LeaveApproved" : verb === "Reject" ? "LeaveRejected" : "LeaveCancelled",
              referenceType: "LeaveApplication", referenceId: existing.id,
              newValue: JSON.stringify({ action: verb, status: verb === "Approve" ? "Approved" : verb === "Reject" ? "Rejected" : "Cancelled" }),
              performedBy: actorId, reason,
            });
          });
          updated += 1;
        } catch (err: any) {
          errors.push({ id, error: err?.message || String(err) });
        }
      }
    } else if (action === "adjustBalance") {
      // payload: { leaveTypeId, adjustmentType: "Credit"|"Debit", amount }
      const leaveTypeId = toStr(payload.leaveTypeId, "")!.trim();
      const adjustmentType = toStr(payload.adjustmentType, "Credit") === "Debit" ? "Debit" : "Credit";
      const amount = toNum(payload.amount, 0) ?? 0;
      if (!leaveTypeId) return bad("payload.leaveTypeId is required");
      if (amount <= 0) return bad("payload.amount must be greater than zero");

      // ids = employee ids.
      for (const empId of ids) {
        try {
          await db.$transaction(async (tx) => {
            const adjustment = await tx.leaveAdjustment.create({
              data: {
                tenantId,
                employeeId: empId,
                leaveTypeId,
                adjustmentType,
                amount,
                effectiveDate: new Date(),
                reason,
                createdBy: actorId,
              },
            });
            const year = new Date().getFullYear();
            const bal = await adjustBalance(tx, {
              tenantId, employeeId: empId, leaveTypeId, year,
              field: "adjusted",
              delta: adjustmentType === "Credit" ? amount : -amount,
            });
            await writeLedger(tx, {
              tenantId, employeeId: empId, leaveTypeId,
              transactionType: adjustmentType === "Credit" ? "ManualCredit" : "ManualDebit",
              credit: adjustmentType === "Credit" ? amount : 0,
              debit: adjustmentType === "Debit" ? amount : 0,
              referenceType: "LeaveAdjustment", referenceId: adjustment.id,
              remarks: reason || `Bulk ${adjustmentType} of ${amount}`, createdBy: actorId,
            });
            await writeAudit(tx, {
              tenantId, employeeId: empId,
              action: "BalanceAdjusted",
              referenceType: "LeaveAdjustment", referenceId: adjustment.id,
              newValue: JSON.stringify({ adjustmentType, amount, available: computeAvailable(bal as any) }),
              performedBy: actorId, reason,
            });
          });
          updated += 1;
        } catch (err: any) {
          errors.push({ id: empId, error: err?.message || String(err) });
        }
      }
    } else if (action === "assignPolicy") {
      // payload: { policyId }
      const policyId = toStr(payload.policyId, "")!.trim();
      if (!policyId) return bad("payload.policyId is required");
      const policy = await db.leavePolicy.findFirst({ where: { id: policyId, tenantId } });
      if (!policy) return bad("Leave policy not found", 404);

      // ids = employee ids. Create a SpecificEmployees applicability.
      const employeeIdsCsv = listToCsv(ids);
      await db.leaveRuleApplicability.create({
        data: {
          tenantId,
          leavePolicyId: policyId,
          applyTo: "SpecificEmployees",
          employeeIds: employeeIdsCsv,
          gender: "All",
        },
      });
      // Also assign the policy to each employee's leavePolicyId.
      for (const empId of ids) {
        try {
          await db.employee.update({
            where: { id: empId },
            data: { leavePolicyId: policyId },
          });
          updated += 1;
        } catch (err: any) {
          errors.push({ id: empId, error: err?.message || String(err) });
        }
      }
    } else if (action === "carryForward") {
      // ids = employee ids. For each employee, for each leave type with carryForward,
      // create LeaveCarryForwardLog + ledger. Use end-of-year balance.available
      // capped at leaveType.carryForwardLimit.
      const fromYear = new Date().getFullYear() - 1;
      const toYear = new Date().getFullYear();
      const leaveTypes = await db.leaveType.findMany({
        where: { tenantId, carryForward: true },
        select: { id: true, code: true, carryForwardLimit: true },
      });

      for (const empId of ids) {
        try {
          await db.$transaction(async (tx) => {
            for (const lt of leaveTypes) {
              const bal = await tx.leaveBalance.findUnique({
                where: { employeeId_leaveTypeId_year: { employeeId: empId, leaveTypeId: lt.id, year: fromYear } },
              });
              if (!bal) continue;
              const available = computeAvailable(bal);
              if (available <= 0) continue;
              const carried = lt.carryForwardLimit
                ? Math.min(available, lt.carryForwardLimit)
                : available;
              const lapsed = Math.max(0, available - carried);

              await tx.leaveCarryForwardLog.create({
                data: {
                  tenantId,
                  employeeId: empId,
                  leaveTypeId: lt.id,
                  fromYear,
                  toYear,
                  carriedForward: carried,
                  lapsed,
                  encashed: 0,
                  processedBy: actorId,
                },
              });

              // Credit the new year's balance.carryForward.
              const newBal = await adjustBalance(tx, {
                tenantId, employeeId: empId, leaveTypeId: lt.id, year: toYear,
                field: "carryForward", delta: carried,
              });
              await writeLedger(tx, {
                tenantId, employeeId: empId, leaveTypeId: lt.id,
                transactionType: "CarryForward",
                credit: carried,
                referenceType: "LeaveCarryForward",
                remarks: `Carry forward from ${fromYear} to ${toYear}`,
                createdBy: actorId,
              });
              if (lapsed > 0) {
                await adjustBalance(tx, {
                  tenantId, employeeId: empId, leaveTypeId: lt.id, year: fromYear,
                  field: "lapsed", delta: lapsed,
                });
                await writeLedger(tx, {
                  tenantId, employeeId: empId, leaveTypeId: lt.id,
                  transactionType: "Lapse",
                  debit: lapsed,
                  referenceType: "LeaveCarryForward",
                  remarks: `Lapsed at year-end (${lapsed})`,
                  createdBy: actorId,
                });
              }
              await writeAudit(tx, {
                tenantId, employeeId: empId,
                action: "CarryForwardProcessed",
                referenceType: "LeaveType", referenceId: lt.id,
                newValue: JSON.stringify({ fromYear, toYear, carried, lapsed, available: computeAvailable(newBal as any) }),
                performedBy: actorId,
              });
            }
          });
          updated += 1;
        } catch (err: any) {
          errors.push({ id: empId, error: err?.message || String(err) });
        }
      }
    } else if (action === "encash") {
      // ids = employee ids. payload: { leaveTypeId, days }
      const leaveTypeId = toStr(payload.leaveTypeId, "")!.trim();
      const days = toNum(payload.days, 0) ?? 0;
      if (!leaveTypeId) return bad("payload.leaveTypeId is required");
      if (days <= 0) return bad("payload.days must be greater than zero");

      for (const empId of ids) {
        try {
          await db.$transaction(async (tx) => {
            const year = new Date().getFullYear();
            const bal = await tx.leaveBalance.findUnique({
              where: { employeeId_leaveTypeId_year: { employeeId: empId, leaveTypeId, year } },
            });
            const available = bal ? computeAvailable(bal) : 0;
            if (available < days) {
              throw new Error(`Insufficient balance (available ${available})`);
            }
            const enc = await tx.leaveEncashmentRequest.create({
              data: {
                tenantId,
                employeeId: empId,
                leaveTypeId,
                days,
                amount: 0,
                status: "Approved",
                decisionAt: new Date(),
                decisionBy: actorId,
                decisionComment: reason || "Bulk encashment",
              },
            });
            // Debit balance.encashed + ledger.
            await adjustBalance(tx, {
              tenantId, employeeId: empId, leaveTypeId, year,
              field: "encashed", delta: days,
            });
            await writeLedger(tx, {
              tenantId, employeeId: empId, leaveTypeId,
              transactionType: "Encashment", debit: days,
              referenceType: "LeaveEncashment", referenceId: enc.id,
              remarks: `Bulk encashment (${days} day(s))`, createdBy: actorId,
            });
            await writeAudit(tx, {
              tenantId, employeeId: empId,
              action: "EncashmentApproved",
              referenceType: "LeaveEncashment", referenceId: enc.id,
              newValue: JSON.stringify({ days, status: "Approved" }),
              performedBy: actorId, reason,
            });
          });
          updated += 1;
        } catch (err: any) {
          errors.push({ id: empId, error: err?.message || String(err) });
        }
      }
    }

    return ok({
      action,
      total: ids.length,
      updated,
      errors,
    });
  } catch (err: any) {
    console.error("[leave-bulk POST]", err);
    return bad("Failed to perform bulk action: " + (err?.message || String(err)), 500);
  }
}
