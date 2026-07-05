import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const wf = await db.workflow.findFirst({
    where: { id, tenantId },
    include: {
      steps: { orderBy: { level: "asc" } },
    },
  });
  if (!wf) return bad("Workflow not found", 404);
  // Fetch approver employees in a separate query (no relation on WorkflowStep)
  const approverIds = wf.steps.map((s) => s.approverId).filter(Boolean) as string[];
  const approvers = approverIds.length
    ? await db.employee.findMany({
        where: { id: { in: approverIds } },
        select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
      })
    : [];
  const approverMap = new Map(approvers.map((a) => [a.id, a]));
  const stepsWithApprover = wf.steps.map((s) => ({
    ...s,
    approver: s.approverId ? approverMap.get(s.approverId) || null : null,
  }));
  return ok({ ...wf, steps: stepsWithApprover });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const existing = await db.workflow.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Workflow not found", 404);

  try {
    const updated = await db.workflow.update({
      where: { id },
      data: {
        ...(body.code ? { code: String(body.code) } : {}),
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.module ? { module: String(body.module) } : {}),
        ...(body.event ? { event: String(body.event) } : {}),
        ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
        ...(body.approvalType ? { approvalType: String(body.approvalType) } : {}),
        ...(body.conditions !== undefined ? { conditions: body.conditions ? (typeof body.conditions === "string" ? body.conditions : JSON.stringify(body.conditions)) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: { steps: { orderBy: { level: "asc" } } },
    });

    // Optional: replace steps if provided
    if (Array.isArray(body.steps)) {
      await db.workflowStep.deleteMany({ where: { workflowId: id } });
      if (body.steps.length > 0) {
        await db.workflowStep.createMany({
          data: body.steps.map((s: any, i: number) => ({
            workflowId: id,
            level: s.level ?? i + 1,
            approverType: s.approverType || "ReportingManager",
            approverId: s.approverId ? String(s.approverId) : null,
            approverRole: s.approverRole ? String(s.approverRole) : null,
            slaHours: s.slaHours ? Number(s.slaHours) : null,
            name: s.name ? String(s.name) : null,
          })),
        });
      }
      const refetch = await db.workflow.findUnique({
        where: { id },
        include: { steps: { orderBy: { level: "asc" } } },
      });
      await db.auditLog.create({ data: { tenantId, module: "workflows", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: updated.code }) } });
      return ok(refetch);
    }

    await db.auditLog.create({ data: { tenantId, module: "workflows", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: updated.code }) } });
    return ok(updated);
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Workflow code already exists", 409);
    return bad("Failed to update workflow", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.workflow.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Workflow not found", 404);
  await db.workflow.delete({ where: { id } });
  await db.auditLog.create({
    data: { tenantId, module: "workflows", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: existing.code }) },
  });
  return ok({ ok: true });
}
