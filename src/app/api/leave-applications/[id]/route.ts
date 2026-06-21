import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/leave-applications/[id]
export async function GET(_req: NextRequest, { params }: Params) {
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
        },
      },
      leaveType: true,
    },
  });
  if (!rec) return bad("Leave application not found", 404);
  return ok(rec);
}

// PATCH /api/leave-applications/[id]
// Used for approve / reject via body { status: "Approved"|"Rejected", decisionComment }
// Also supports withdrawing / cancelling via { status: "Withdrawn"|"Cancelled" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const existing = await db.leaveApplication.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Leave application not found", 404);

  const status = body.status ? String(body.status) : undefined;
  const validStatuses = ["Pending", "Approved", "Rejected", "Cancelled", "Withdrawn"];
  if (status && !validStatuses.includes(status)) {
    return bad(`Invalid status. Allowed: ${validStatuses.join(", ")}`);
  }

  const data: any = {};
  if (status) data.status = status;
  if (body.decisionComment !== undefined) data.decisionComment = String(body.decisionComment);

  // If approving/rejecting, stamp decision metadata
  if (status === "Approved" || status === "Rejected") {
    data.decisionAt = new Date();
    data.decisionBy = "hr-admin";
  }

  // Optional: create a WorkflowInstance + WorkflowAction when approving/rejecting
  if (status === "Approved" || status === "Rejected") {
    try {
      const workflow = await db.workflow.findFirst({
        where: { tenantId, module: "leave", isActive: true },
        include: { steps: { orderBy: { level: "asc" } } },
      });
      if (workflow) {
        const instance = await db.workflowInstance.create({
          data: {
            tenantId,
            workflowId: workflow.id,
            module: "leave",
            recordId: existing.id,
            initiatorId: existing.employeeId,
            status: status === "Approved" ? "Approved" : "Rejected",
            currentLevel: workflow.steps.length || 1,
            completedAt: new Date(),
          },
        });
        data.workflowInstanceId = instance.id;
        if (workflow.steps.length > 0) {
          await db.workflowAction.create({
            data: {
              instanceId: instance.id,
              stepId: workflow.steps[0].id,
              action: status === "Approved" ? "Approve" : "Reject",
              actorId: "hr-admin",
              comment: body.decisionComment ? String(body.decisionComment) : null,
            },
          });
        }
      }
    } catch {
      // Workflow logging is best-effort; ignore failures.
    }
  }

  const updated = await db.leaveApplication.update({
    where: { id },
    data,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          displayName: true,
        },
      },
      leaveType: true,
    },
  });
  return ok(updated);
}
