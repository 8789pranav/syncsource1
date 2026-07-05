import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);
  const wf = await db.workflow.findFirst({ where: { id, tenantId } });
  if (!wf) return bad("Workflow not found", 404);

  // Determine next level
  const max = await db.workflowStep.aggregate({ where: { workflowId: id }, _max: { level: true } });
  const nextLevel = (max._max.level || 0) + 1;

  try {
    const step = await db.workflowStep.create({
      data: {
        workflowId: id,
        level: body.level ? Number(body.level) : nextLevel,
        approverType: body.approverType ? String(body.approverType) : "ReportingManager",
        approverId: body.approverId ? String(body.approverId) : null,
        approverRole: body.approverRole ? String(body.approverRole) : null,
        slaHours: body.slaHours ? Number(body.slaHours) : null,
        name: body.name ? String(body.name) : null,
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "workflows", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ addedStep: step.level }) },
    });
    return created(step);
  } catch {
    return bad("Failed to add step", 500);
  }
}
