import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, created, bad, parseBody, listResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant();
  const { searchParams } = new URL(req.url);
  const moduleFilter = searchParams.get("module") || "";

  const where: any = { tenantId };
  if (moduleFilter) where.module = moduleFilter;

  const items = await db.formSchema.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  const parsed = items.map((f) => {
    let sections: any = [];
    try { sections = JSON.parse(f.sections); } catch {}
    return {
      ...f,
      sections,
    };
  });
  return listResponse(parsed);
}

export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant();
  const body = await parseBody(req);
  if (!body.code || !body.name || !body.module) return bad("code, name and module are required");
  const sections = Array.isArray(body.sections) ? body.sections : [];
  try {
    const form = await db.formSchema.create({
      data: {
        tenantId,
        code: String(body.code),
        name: String(body.name),
        module: String(body.module),
        description: body.description ? String(body.description) : null,
        sections: JSON.stringify(sections),
        status: body.status ? String(body.status) : "Published",
        version: 1,
      },
    });
    await db.auditLog.create({
      data: { tenantId, module: "forms", action: "Create", recordId: form.id, userName: "HR Admin", details: JSON.stringify({ code: form.code, name: form.name }) },
    });
    return created({ ...form, sections });
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") return bad("Form code already exists", 409);
    return bad("Failed to create form", 500);
  }
}
