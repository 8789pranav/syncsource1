import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const { searchParams } = new URL(req.url);
  const moduleFilter = searchParams.get("module") || "";
  const isActive = searchParams.get("active");

  const where: any = { tenantId };
  if (moduleFilter) where.module = moduleFilter;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const items = await db.workflow.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { steps: true } } },
  });
  return listResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  if (!body.code || !body.name || !body.module) return bad("code, name and module are required");
  try {
    const wf = await db.workflow.create({
      data: {
        tenantId,
        code: String(body.code),
        name: String(body.name),
        module: String(body.module),
        event: body.event ? String(body.event) : "apply",
        description: body.description ? String(body.description) : null,
        approvalType: body.approvalType ? String(body.approvalType) : "Sequential",
        conditions: body.conditions ? (typeof body.conditions === "string" ? body.conditions : JSON.stringify(body.conditions)) : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
      include: { steps: { orderBy: { level: "asc" } } },
    });

    // Optional: inline create steps too (for the builder)
    if (Array.isArray(body.steps) && body.steps.length > 0) {
      await db.workflowStep.createMany({
        data: body.steps.map((s: any, i: number) => ({
          workflowId: wf.id,
          level: s.level ?? i + 1,
          approverType: s.approverType || "ReportingManager",
          approverId: s.approverId ? String(s.approverId) : null,
          approverRole: s.approverRole ? String(s.approverRole) : null,
          slaHours: s.slaHours ? Number(s.slaHours) : null,
          name: s.name ? String(s.name) : null,
        })),
      });
    }

    const full = await db.workflow.findUnique({ where: { id: wf.id }, include: { steps: { orderBy: { level: "asc" } } } });
    await db.auditLog.create({
      data: { tenantId, module: "workflows", action: "Create", recordId: wf.id, userName: "HR Admin", details: JSON.stringify({ code: wf.code }) },
    });
    return created(full);
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Workflow code already exists", 409);
    return bad("Failed to create workflow", 500);
  }
}
