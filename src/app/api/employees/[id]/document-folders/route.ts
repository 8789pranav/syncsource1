import { NextRequest } from "next/server"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"
import {
  rawListFolders, rawCreateFolder, normalizeFolder,
} from "@/lib/employee-doc-raw"

// GET — list folders for an employee with document counts + latest activity
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rows = await rawListFolders(tenantId, id)
  const items = rows.map(r => ({
    ...normalizeFolder(r),
    docCount: Number((r as any).docCount ?? 0),
    lastActivityAt: (r as any).lastActivityAt
      ? (r as any).lastActivityAt instanceof Date
        ? (r as any).lastActivityAt.toISOString()
        : String((r as any).lastActivityAt)
      : normalizeFolder(r).createdAt,
  }))
  return ok({ items })
}

// POST — create a folder
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Folder name is required")

  const createdBy = strOrNull(body.createdBy) || "HR Admin"

  const newId = await rawCreateFolder({
    tenantId,
    employeeId: id,
    name,
    description: strOrNull(body.description),
    color: strOrNull(body.color),
    createdBy,
  })

  // Read back via raw list (single-row filter)
  const rows = await rawListFolders(tenantId, id)
  const rec = rows.find(r => r.id === newId)
  if (!rec) return created({ id: newId, name, tenantId, employeeId: id })

  const item = {
    ...normalizeFolder(rec),
    docCount: Number((rec as any).docCount ?? 0),
    lastActivityAt: (rec as any).lastActivityAt
      ? ((rec as any).lastActivityAt instanceof Date
          ? (rec as any).lastActivityAt.toISOString()
          : String((rec as any).lastActivityAt))
      : normalizeFolder(rec).createdAt,
  }

  await logTimeline({
    tenantId, employeeId: id, eventType: "Folder created",
    title: "Document folder created",
    description: `${name}`,
    actorName: createdBy,
    metadata: { folderId: newId, folderName: name },
  })

  return created(item)
}
