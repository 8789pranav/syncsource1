import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const tenantId = await ensureTenant();
  const { id, stepId } = await params;
  const body = await parseBody(req);
  const wf = await db.workflow.findFirst({ where: { id, tenantId } });
  if (!wf) return bad("Workflow not found", 404);
  const step = await db.workflowStep.findUnique({ where: { id: stepId } });
  if (!step || step.workflowId !== id) return bad("Step not found", 404);

  try {
    const updated = await db.workflowStep.update({
      where: { id: stepId },
      data: {
        ...(body.level !== undefined ? { level: Number(body.level) } : {}),
        ...(body.approverType ? { approverType: String(body.approverType) } : {}),
        ...(body.approverId !== undefined ? { approverId: body.approverId ? String(body.approverId) : null } : {}),
        ...(body.approverRole !== undefined ? { approverRole: body.approverRole ? String(body.approverRole) : null } : {}),
        ...(body.slaHours !== undefined ? { slaHours: body.slaHours === null ? null : Number(body.slaHours) } : {}),
        ...(body.name !== undefined ? { name: body.name ? String(body.name) : null } : {}),
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "workflows", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ step: stepId }) },
    });
    return ok(updated);
  } catch {
    return bad("Failed to update step", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const tenantId = await ensureTenant();
  const { id, stepId } = await params;
  const wf = await db.workflow.findFirst({ where: { id, tenantId } });
  if (!wf) return bad("Workflow not found", 404);
  const step = await db.workflowStep.findUnique({ where: { id: stepId } });
  if (!step || step.workflowId !== id) return bad("Step not found", 404);
  await db.workflowStep.delete({ where: { id: stepId } });
  // re-level remaining steps
  const remaining = await db.workflowStep.findMany({ where: { workflowId: id }, orderBy: { level: "asc" } });
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].level !== i + 1) {
      await db.workflowStep.update({ where: { id: remaining[i].id }, data: { level: i + 1 } });
    }
  }
  await db.auditLog.create({
    data: { tenantId, module: "workflows", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ deletedStep: stepId }) },
  });
  return ok({ ok: true });
}
