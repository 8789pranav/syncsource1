import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";
import {
  toBool,
  toNum,
  toStr,
  toDate,
  findEmployeesForPolicy,
  upsertBalance,
  writeLedger,
  writeAudit,
} from "@/lib/leave-helpers";
import { buildItemData, buildApplicabilityData } from "../route";

type Params = { params: Promise<{ id: string }> };

// GET /api/leave-policies/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const rec = await db.leavePolicy.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { leaveType: true }, orderBy: { createdAt: "asc" } },
        applicabilities: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!rec) return bad("Leave policy not found", 404);

    // Compute assignedEmployeeCount from applicabilities.
    const emps = await findEmployeesForPolicy(db as any, rec.id);
    return ok({ ...rec, assignedEmployeeCount: emps.length });
  } catch (err: any) {
    console.error("[leave-policies GET id]", err);
    return bad("Failed to fetch leave policy: " + (err?.message || String(err)), 500);
  }
}

// PATCH /api/leave-policies/[id] — update scalar + optional items/applicabilities replace.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const body = await parseBody(req);

    const existing = await db.leavePolicy.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Leave policy not found", 404);

    const code = body.code !== undefined ? toStr(body.code, "")!.trim() : undefined;
    if (code && code !== existing.code) {
      const dup = await db.leavePolicy.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (dup) return bad(`Leave policy with code '${code}' already exists`, 409);
    }

    const isDefault = body.isDefault !== undefined ? toBool(body.isDefault, false) : undefined;

    const rec = await db.$transaction(async (tx) => {
      // If isDefault: true, unset other defaults first.
      if (isDefault === true) {
        await tx.leavePolicy.updateMany({
          where: { tenantId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      const data: any = {
        version: { increment: 1 },
      };
      if (code !== undefined) data.code = code;
      if (body.name !== undefined) data.name = toStr(body.name, "")!.trim();
      if (body.description !== undefined) data.description = toStr(body.description);
      if (body.country !== undefined) data.country = toStr(body.country, "India")!;
      if (body.leaveYearType !== undefined) data.leaveYearType = toStr(body.leaveYearType, "CalendarYear")!;
      if (body.calendarStartMonth !== undefined) data.calendarStartMonth = toNum(body.calendarStartMonth, 1) ?? 1;
      if (body.effectiveFrom !== undefined) data.effectiveFrom = toDate(body.effectiveFrom);
      if (body.effectiveTo !== undefined) data.effectiveTo = toDate(body.effectiveTo);
      if (isDefault !== undefined) data.isDefault = isDefault;
      if (body.priority !== undefined) data.priority = toNum(body.priority, 0) ?? 0;
      if (body.status !== undefined) data.status = toStr(body.status, "Active")!;
      if (body.settingsJson !== undefined) data.settingsJson = toStr(body.settingsJson);
      if (body.createdBy !== undefined) data.createdBy = toStr(body.createdBy);

      // Replace items if provided.
      if (Array.isArray(body.items)) {
        await tx.leavePolicyItem.deleteMany({ where: { leavePolicyId: id } });
        for (const it of body.items) {
          if (!it || !it.leaveTypeId) continue;
          await tx.leavePolicyItem.create({ data: buildItemData(id, it) });
        }
      }

      // Replace applicabilities if provided.
      if (Array.isArray(body.applicabilities)) {
        await tx.leaveRuleApplicability.deleteMany({ where: { leavePolicyId: id } });
        for (const a of body.applicabilities) {
          if (!a || !a.applyTo) continue;
          await tx.leaveRuleApplicability.create({
            data: buildApplicabilityData(tenantId, id, a),
          });
        }
      }

      return tx.leavePolicy.update({
        where: { id },
        data,
        include: {
          items: { include: { leaveType: true } },
          applicabilities: true,
          _count: { select: { items: true, applicabilities: true } },
        },
      });
    });

    return ok(rec);
  } catch (err: any) {
    console.error("[leave-policies PATCH id]", err);
    return bad("Failed to update leave policy: " + (err?.message || String(err)), 500);
  }
}

// DELETE /api/leave-policies/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await ensureTenant();
    const { id } = await params;
    const existing = await db.leavePolicy.findFirst({ where: { id, tenantId } });
    if (!existing) return bad("Leave policy not found", 404);
    await db.leavePolicy.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err: any) {
    console.error("[leave-policies DELETE id]", err);
    return bad("Failed to delete leave policy: " + (err?.message || String(err)), 500);
  }
}
