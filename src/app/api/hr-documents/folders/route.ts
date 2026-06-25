import { NextRequest } from "next/server"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import {
  rawListHRFolders, rawCreateHRFolder, normalizeHRFolder,
} from "@/lib/hr-doc-raw"

function strOrNull(v: unknown, fallback?: string): string | null {
  if (v === undefined || v === null) return fallback ?? null
  const s = String(v).trim()
  return s === "" ? (fallback ?? null) : s
}

// GET — list all HR document folders with doc counts
export async function GET(_req: NextRequest) {
  const tenantId = await ensureTenant()
  const rows = await rawListHRFolders(tenantId)
  const items = rows.map(r => ({
    ...normalizeHRFolder(r),
    docCount: Number((r as any).docCount ?? 0),
    lastActivityAt: (r as any).lastActivityAt
      ? (r as any).lastActivityAt instanceof Date
        ? (r as any).lastActivityAt.toISOString()
        : String((r as any).lastActivityAt)
      : normalizeHRFolder(r).createdAt,
  }))
  return ok({ items })
}

// POST — create a new HR document folder
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Folder name is required")
  const createdBy = strOrNull(body.createdBy) || "HR Admin"

  const id = await rawCreateHRFolder({
    tenantId,
    name,
    description: strOrNull(body.description),
    color: strOrNull(body.color),
    createdBy,
  })

  // Re-fetch and return
  const rows = await rawListHRFolders(tenantId)
  const created = rows.find(r => r.id === id)
  if (!created) return ok({ id })
  return ok({
    ...normalizeHRFolder(created),
    docCount: 0,
    lastActivityAt: normalizeHRFolder(created).createdAt,
  })
}
