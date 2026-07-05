import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody, listResponse } from "@/lib/api-helpers";

// ============================================================
// /api/leave-sandwich
// ------------------------------------------------------------
// Manages sandwich-rule configuration stored on LeavePolicyItem.
//
// GET  /api/leave-sandwich?policyId=
//      -> flattened list of every LeavePolicyItem with its sandwich
//         config, joined with policy + leave-type for display.
//
// PATCH /api/leave-sandwich
//      body: { itemId, sandwichRule, includeHolidays, includeWeeklyOffs, sandwichConfig }
//      -> updates a single policy item's sandwich config.
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const policyId = sp.get("policyId");

    const where: any = { leavePolicy: { tenantId } };
    if (policyId) where.leavePolicyId = policyId;

    const items = await db.leavePolicyItem.findMany({
      where,
      include: {
        leaveType: true,
        leavePolicy: { select: { id: true, name: true, code: true, status: true, isDefault: true } },
      },
      orderBy: [{ leavePolicy: { priority: "desc" } }, { leaveType: { displayOrder: "asc" } }],
    });

    const rows = items.map((it) => ({
      itemId: it.id,
      policyId: it.leavePolicyId,
      policyName: it.leavePolicy.name,
      policyCode: it.leavePolicy.code,
      policyStatus: it.leavePolicy.status,
      isDefaultPolicy: it.leavePolicy.isDefault,
      leaveTypeId: it.leaveTypeId,
      leaveTypeName: it.leaveType.name,
      leaveTypeCode: it.leaveType.code,
      leaveTypeColor: it.leaveType.color,
      leaveTypeCategory: it.leaveType.category,
      leaveTypeIsPaid: it.leaveType.isPaid,
      displayName: it.displayName,
      isActive: it.isActive,
      sandwichRule: it.sandwichRule,
      includeHolidays: it.includeHolidays,
      includeWeeklyOffs: it.includeWeeklyOffs,
      sandwichConfig: safeParse(it.sandwichConfigJson),
    }));

    return listResponse(rows);
  } catch (err: any) {
    console.error("[leave-sandwich GET]", err);
    return bad("Failed to load sandwich rules: " + (err?.message || String(err)), 500);
  }
}

// PATCH /api/leave-sandwich — update a single policy item's sandwich config
export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const itemId = String(body.itemId || "");
    if (!itemId) return bad("itemId is required");

    const existing = await db.leavePolicyItem.findFirst({
      where: { id: itemId, leavePolicy: { tenantId } },
    });
    if (!existing) return bad("Leave policy item not found", 404);

    const data: any = {};
    if (body.sandwichRule !== undefined) data.sandwichRule = Boolean(body.sandwichRule);
    if (body.includeHolidays !== undefined) data.includeHolidays = Boolean(body.includeHolidays);
    if (body.includeWeeklyOffs !== undefined) data.includeWeeklyOffs = Boolean(body.includeWeeklyOffs);
    if (body.sandwichConfig !== undefined) {
      const cfg = body.sandwichConfig;
      data.sandwichConfigJson =
        typeof cfg === "string" ? cfg : JSON.stringify(cfg ?? {});
    }

    const updated = await db.leavePolicyItem.update({
      where: { id: itemId },
      data,
      include: { leaveType: true, leavePolicy: { select: { name: true, code: true } } },
    });

    return ok({
      itemId: updated.id,
      sandwichRule: updated.sandwichRule,
      includeHolidays: updated.includeHolidays,
      includeWeeklyOffs: updated.includeWeeklyOffs,
      sandwichConfig: safeParse(updated.sandwichConfigJson),
      leaveTypeName: updated.leaveType.name,
      policyName: updated.leavePolicy.name,
    });
  } catch (err: any) {
    console.error("[leave-sandwich PATCH]", err);
    return bad("Failed to save sandwich rule: " + (err?.message || String(err)), 500);
  }
}

function safeParse(s?: string | null): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
