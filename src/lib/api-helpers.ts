import { NextResponse } from "next/server"
import { db, DEFAULT_TENANT_ID } from "@/lib/db"

// Ensure the default tenant exists; return its id.
export async function ensureTenant() {
  let tenant = await db.tenant.findUnique({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        id: DEFAULT_TENANT_ID,
        code: "ACME",
        name: "ACME Corporation",
        legalName: "ACME Services Pvt Ltd",
        brandColor: "#10b981",
      },
    })
  }
  return tenant.id
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function parseBody(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json()
    return body || {}
  } catch {
    return {}
  }
}

// Convert a Prisma record to a picker item {label, value}
export function toPicker(items: any[], labelKey = "name"): { label: string; value: string }[] {
  return items.map((it) => ({
    label: it[labelKey] || it.code || it.id,
    value: it.id,
  }))
}

// Generic list wrapper
export function listResponse<T>(items: T[]) {
  return ok({ items })
}
