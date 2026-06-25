import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody, listResponse } from "@/lib/api-helpers";

// ============================================================
// /api/leave-clubbing
// ------------------------------------------------------------
// Manages clubbing-rule configuration stored on LeavePolicyItem.
//
// GET  /api/leave-clubbing?policyId=
//      -> flattened list of every LeavePolicyItem with its clubbing
//         config, joined with policy + leave-type for display.
//
// PATCH /api/leave-clubbing
//      body: { itemId, clubbingAllowed, clubbingConfig }
//      -> updates a single policy item's clubbing config.
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
      clubbingAllowed: it.clubbingAllowed,
      clubbingConfig: safeParse(it.clubbingConfigJson),
    }));

    return listResponse(rows);
  } catch (err: any) {
    console.error("[leave-clubbing GET]", err);
    return bad("Failed to load clubbing rules: " + (err?.message || String(err)), 500);
  }
}

// PATCH /api/leave-clubbing — update a single policy item's clubbing config
export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const body = await parseBody(req);
    const itemId = String(body.itemId || "");
    if (!itemId) return bad("itemId is required");

    // Verify ownership
    const existing = await db.leavePolicyItem.findFirst({
      where: { id: itemId, leavePolicy: { tenantId } },
    });
    if (!existing) return bad("Leave policy item not found", 404);

    const data: any = {};
    if (body.clubbingAllowed !== undefined) {
      data.clubbingAllowed = Boolean(body.clubbingAllowed);
    }
    if (body.clubbingConfig !== undefined) {
      const cfg = body.clubbingConfig;
      data.clubbingConfigJson =
        typeof cfg === "string" ? cfg : JSON.stringify(cfg ?? {});
    }

    const updated = await db.leavePolicyItem.update({
      where: { id: itemId },
      data,
      include: { leaveType: true, leavePolicy: { select: { name: true, code: true } } },
    });

    return ok({
      itemId: updated.id,
      clubbingAllowed: updated.clubbingAllowed,
      clubbingConfig: safeParse(updated.clubbingConfigJson),
      leaveTypeName: updated.leaveType.name,
      policyName: updated.leavePolicy.name,
    });
  } catch (err: any) {
    console.error("[leave-clubbing PATCH]", err);
    return bad("Failed to save clubbing rule: " + (err?.message || String(err)), 500);
  }
}

function safeParse(s?: string | null): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
