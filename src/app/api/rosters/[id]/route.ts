import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/rosters/[id] — full roster with entries (employee + shift)
export async function GET(_req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const rec = await db.roster.findFirst({
    where: { id, tenantId },
    include: {
      entries: {
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              middleName: true,
              lastName: true,
              displayName: true,
            },
          },
          shift: true,
        },
        orderBy: { date: "asc" },
      },
    },
  });
  if (!rec) return bad("Roster not found", 404);
  return ok(rec);
}

// PATCH /api/rosters/[id] — update status / fields
export async function PATCH(req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const body = await parseBody(req);

  const existing = await db.roster.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Roster not found", 404);

  if (body.code !== undefined) {
    const code = String(body.code).trim();
    if (code && code !== existing.code) {
      const dup = await db.roster.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (dup) return bad(`Roster with code '${code}' already exists`, 409);
    }
  }

  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.code !== undefined) data.code = String(body.code).trim();
  if (body.cycle !== undefined) data.cycle = String(body.cycle);
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.status !== undefined) data.status = String(body.status);

  // Stamp publishedAt when status transitions to Published
  if (body.status === "Published" && existing.status !== "Published") {
    data.publishedAt = new Date();
  }
  if (body.status && body.status !== "Published") {
    data.publishedAt = null;
  }

  const updated = await db.roster.update({ where: { id }, data });
  return ok(updated);
}

// DELETE /api/rosters/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const tenantId = await ensureTenant();
  const { id } = await params;
  const existing = await db.roster.findFirst({ where: { id, tenantId } });
  if (!existing) return bad("Roster not found", 404);
  await db.roster.delete({ where: { id } });
  return ok({ ok: true });
}
