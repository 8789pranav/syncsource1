// Shared helpers for employee sub-record section APIs.
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"

// ---- coercions ----
export function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
export function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
export function toFloat(v: unknown): number | undefined {
  return toNum(v)
}
export function toBool(v: unknown, fallback?: boolean): boolean | undefined {
  if (v === undefined || v === null || v === "") return fallback
  if (typeof v === "boolean") return v
  const s = String(v).toLowerCase().trim()
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true
  if (s === "false" || s === "0" || s === "no" || s === "off") return false
  return fallback
}
export function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}
export function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

// ---- employee existence check ----
export async function getEmployee(tenantId: string, employeeId: string) {
  return db.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true, firstName: true, lastName: true, employeeCode: true } })
}

// ---- context helpers ----
export type RouteCtx = { params: Promise<{ id: string }> }
export type RecordCtx = { params: Promise<{ id: string; recordId: string }> }

// ---- generic list+create factory ----
export function makeListHandler<T extends { tenantId: string; employeeId: string }>(opts: {
  model: any
  orderBy?: Record<string, "asc" | "desc">
  extraInclude?: Record<string, unknown>
}) {
  return async function GET(_req: NextRequest, ctx: RouteCtx) {
    const tenantId = await ensureTenant()
    const { id } = await ctx.params
    const emp = await getEmployee(tenantId, id)
    if (!emp) return bad("Employee not found", 404)
    const items = await opts.model.findMany({
      where: { tenantId, employeeId: id },
      orderBy: opts.orderBy ?? { createdAt: "desc" },
      include: opts.extraInclude as any,
    })
    return ok({ items })
  }
}

// ---- timeline helper ----
export async function logTimeline(opts: {
  tenantId: string
  employeeId: string
  eventType: string
  title: string
  description?: string | null
  actorName?: string
  actorId?: string | null
  metadata?: Record<string, unknown> | null
  eventDate?: Date
}) {
  try {
    await db.employeeTimelineEvent.create({
      data: {
        tenantId: opts.tenantId,
        employeeId: opts.employeeId,
        eventType: opts.eventType,
        title: opts.title,
        description: opts.description || undefined,
        actorName: opts.actorName || "HR Admin",
        actorId: opts.actorId || undefined,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        eventDate: opts.eventDate || new Date(),
      },
    })
  } catch {
    // best-effort
  }
}

// ---- audit helper ----
export async function logAudit(opts: {
  tenantId: string
  employeeId: string
  module: string
  action: string
  field?: string | null
  oldValue?: string | null
  newValue?: string | null
  changedBy?: string
}) {
  try {
    await db.employeeAuditLog.create({
      data: {
        tenantId: opts.tenantId,
        employeeId: opts.employeeId,
        module: opts.module,
        action: opts.action,
        field: opts.field || null,
        oldValue: opts.oldValue || null,
        newValue: opts.newValue || null,
        changedBy: opts.changedBy || "HR Admin",
      },
    })
  } catch {
    // best-effort
  }
}

// re-export for convenience
export { ensureTenant, ok, bad, created, parseBody, db }
