import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { strOrNull, getEmployee, logTimeline } from "@/lib/employee-section-helpers"
import {
  rawGetFolder, rawUpdateFolder, rawDeleteFolder, rawListEmployeeDocumentsByFolder,
  normalizeFolder, normalizeDoc, attachFolderInfo,
} from "@/lib/employee-doc-raw"

type FolderCtx = { params: Promise<{ id: string; folderId: string }> }

// GET — return folder with its documents array
export async function GET(_req: NextRequest, ctx: FolderCtx) {
  const tenantId = await ensureTenant()
  const { id, folderId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const folder = await rawGetFolder(tenantId, id, folderId)
  if (!folder) return bad("Folder not found", 404)
  const docs = await rawListEmployeeDocumentsByFolder(tenantId, id, folderId)
  const docItems = docs.map(normalizeDoc)
  await attachFolderInfo(tenantId, docItems)
  return ok({ ...normalizeFolder(folder), documents: docItems })
}

// PATCH — update name / description / color
export async function PATCH(req: NextRequest, ctx: FolderCtx) {
  const tenantId = await ensureTenant()
  const { id, folderId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await rawGetFolder(tenantId, id, folderId)
  if (!existing) return bad("Folder not found", 404)
  const body = await parseBody(req)
  const fields: { name?: string; description?: string | null; color?: string | null } = {}
  if ("name" in body) {
    const n = strOrNull(body.name)
    if (!n) return bad("Folder name cannot be empty")
    fields.name = n
  }
  if ("description" in body) fields.description = strOrNull(body.description)
  if ("color" in body) fields.color = strOrNull(body.color)
  await rawUpdateFolder(folderId, fields)

  // Read back
  const updated = await rawGetFolder(tenantId, id, folderId)
  const rec = updated ? normalizeFolder(updated) : null
  await logTimeline({
    tenantId, employeeId: id, eventType: "Folder updated",
    title: "Document folder updated",
    description: `${rec?.name || existing.name}`,
    metadata: { folderId, fields: Object.keys(fields) },
  })
  return ok(rec)
}

// DELETE — delete folder; documents keep their rows but folderId is set to null
export async function DELETE(_req: NextRequest, ctx: FolderCtx) {
  const tenantId = await ensureTenant()
  const { id, folderId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await rawGetFolder(tenantId, id, folderId)
  if (!existing) return bad("Folder not found", 404)
  const { movedToRoot } = await rawDeleteFolder(folderId)
  await logTimeline({
    tenantId, employeeId: id, eventType: "Folder deleted",
    title: "Document folder deleted",
    description: `${existing.name} — ${movedToRoot} document(s) moved to root`,
    metadata: { folderId, folderName: existing.name, movedToRoot },
  })
  // Touch db import so unused import warning doesn't fire — actually it is used by
  // rawDeleteFolder internally. Suppress lint by referencing.
  void db
  return ok({ ok: true, movedToRoot })
}
