import { NextRequest } from "next.server"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import {
  rawGetHRFolder, rawUpdateHRFolder, rawDeleteHRFolder, normalizeHRFolder,
  rawListHRDocumentsByFolder, normalizeHRDoc,
} from "@/lib/hr-doc-raw"

function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

interface Ctx { params: Promise<{ folderId: string }> }

// GET — folder detail with its documents
export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { folderId } = await ctx.params
  const folder = await rawGetHRFolder(tenantId, folderId)
  if (!folder) return bad("Folder not found", 404)
  const docs = await rawListHRDocumentsByFolder(tenantId, folderId)
  return ok({
    ...normalizeHRFolder(folder),
    documents: docs.map(normalizeHRDoc),
  })
}

// PATCH — rename / update folder
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { folderId } = await ctx.params
  const existing = await rawGetHRFolder(tenantId, folderId)
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
  await rawUpdateHRFolder(folderId, fields)
  const updated = await rawGetHRFolder(tenantId, folderId)
  return ok(normalizeHRFolder(updated!))
}

// DELETE — delete folder; documents move to root (folderId set to null)
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { folderId } = await ctx.params
  const existing = await rawGetHRFolder(tenantId, folderId)
  if (!existing) return bad("Folder not found", 404)
  const { movedToRoot } = await rawDeleteHRFolder(folderId)
  return ok({ ok: true, movedToRoot })
}
