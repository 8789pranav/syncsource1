import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  ensureTenant,
  ok,
  created,
  bad,
  parseBody,
  listResponse,
} from "@/lib/api-helpers";

// GET /api/leave-policies -> { items: [...] } (includes items -> leaveType)
export async function GET() {
  const tenantId = await ensureTenant();
  const items = await db.leavePolicy.findMany({
    where: { tenantId },
    include: {
      items: { include: { leaveType: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return listResponse(items);
}

// POST /api/leave-policies
// Body: { name, code, description?, effectiveDate?, items?: [{ leaveTypeId, allocation }] }
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  const name = String(body.name || "").trim();
  const code = String(body.code || "").trim();
  if (!name || !code) return bad("name and code are required");

  const exists = await db.leavePolicy.findFirst({
    where: { tenantId, code },
  });
  if (exists) return bad(`Leave policy with code '${code}' already exists`, 409);

  const items: Array<{ leaveTypeId: string; allocation: number }> = Array.isArray(body.items)
    ? body.items
        .filter((it: any) => it && it.leaveTypeId)
        .map((it: any) => ({
          leaveTypeId: String(it.leaveTypeId),
          allocation: Number(it.allocation) || 0,
        }))
    : [];

  const rec = await db.leavePolicy.create({
    data: {
      tenantId,
      name,
      code,
      description: body.description ? String(body.description) : null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      status: body.status ? String(body.status) : "Active",
      items:
        items.length > 0
          ? { create: items.map((it) => ({ leaveTypeId: it.leaveTypeId, allocation: it.allocation })) }
          : undefined,
    },
    include: { items: { include: { leaveType: true } } },
  });
  return created(rec);
}
