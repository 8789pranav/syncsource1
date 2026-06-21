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

// GET /api/leave-types -> { items: [...] }
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const status = req.nextUrl.searchParams.get("status");
  const items = await db.leaveType.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  return listResponse(items);
}

// POST /api/leave-types
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  if (!code || !name) return bad("code and name are required");

  // Enforce uniqueness within tenant
  const exists = await db.leaveType.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (exists) return bad(`Leave type with code '${code}' already exists`, 409);

  const data: any = {
    tenantId,
    code,
    name,
    color: body.color ? String(body.color) : "#10b981",
    isPaid: toBool(body.isPaid, true),
    fullDayAllowed: toBool(body.fullDayAllowed, true),
    halfDayAllowed: toBool(body.halfDayAllowed, false),
    hourlyAllowed: toBool(body.hourlyAllowed, false),
    monthlyAccrual: toNum(body.monthlyAccrual, 0),
    yearlyAccrual: toNum(body.yearlyAccrual, 0),
    openingBalance: toNum(body.openingBalance, 0),
    carryForward: toBool(body.carryForward, false),
    carryForwardLimit: body.carryForwardLimit ? toNum(body.carryForwardLimit, null) : null,
    encashment: toBool(body.encashment, false),
    negativeAllowed: toBool(body.negativeAllowed, false),
    attachmentRequired: toBool(body.attachmentRequired, false),
    reasonRequired: toBool(body.reasonRequired, true),
    genderApplicability: body.genderApplicability ? String(body.genderApplicability) : "All",
    minDays: toNum(body.minDays, 1),
    maxDays: body.maxDays ? toNum(body.maxDays, null) : null,
    backdatedAllowed: toBool(body.backdatedAllowed, true),
    futureAllowed: toBool(body.futureAllowed, true),
    status: body.status ? String(body.status) : "Active",
  };

  const rec = await db.leaveType.create({ data });
  return created(rec);
}

function toBool(v: unknown, def: boolean): boolean {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes";
  return Boolean(v);
}
function toNum(v: unknown, def: number | null): number | null {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
