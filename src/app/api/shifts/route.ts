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

// GET /api/shifts -> { items: [...] }
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const status = req.nextUrl.searchParams.get("status");
  const items = await db.shift.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { startTime: "asc" },
  });
  return listResponse(items);
}

// POST /api/shifts
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  const startTime = body.startTime ? String(body.startTime) : "";
  const endTime = body.endTime ? String(body.endTime) : "";
  if (!code || !name) return bad("code and name are required");
  if (!startTime || !endTime) return bad("startTime and endTime are required");

  const exists = await db.shift.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (exists) return bad(`Shift with code '${code}' already exists`, 409);

  const workingHours = body.workingHours !== undefined ? toNum(body.workingHours, 8) ?? 8 : 8;

  const rec = await db.shift.create({
    data: {
      tenantId,
      code,
      name,
      startTime,
      endTime,
      breakStart: body.breakStart ? String(body.breakStart) : null,
      breakEnd: body.breakEnd ? String(body.breakEnd) : null,
      workingHours,
      graceMinutes: toNum(body.graceMinutes, 15) ?? 15,
      halfDayHours: toNum(body.halfDayHours, 4) ?? 4,
      fullDayHours: toNum(body.fullDayHours, 8) ?? 8,
      isNightShift: toBool(body.isNightShift, false),
      isFlexible: toBool(body.isFlexible, false),
      autoPunchOut: toBool(body.autoPunchOut, false),
      overtimeEligible: toBool(body.overtimeEligible, false),
      color: body.color ? String(body.color) : "#10b981",
      status: body.status ? String(body.status) : "Active",
    },
  });
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
