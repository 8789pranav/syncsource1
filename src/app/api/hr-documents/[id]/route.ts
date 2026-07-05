import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import {
  rawGetHRDocument, rawUpdateHRDocument, rawDeleteHRDocument,
  normalizeHRDoc, attachHRFolderInfo,
} from "@/lib/hr-doc-raw"

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}
function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
function toBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null) return undefined
  return v === true || v === "true" || v === 1 || v === "1"
}

interface Ctx { params: Promise<{ id: string }> }

// GET — single HR document
export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const row = await rawGetHRDocument(tenantId, id)
  if (!row) return bad("Document not found", 404)
  const rec = normalizeHRDoc(row)
  await attachHRFolderInfo(tenantId, [rec])
  return ok(rec)
}

// PATCH — update an HR document
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await rawGetHRDocument(tenantId, id)
  if (!existing) return bad("Document not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}

  if ("name" in body) data.name = strOrNull(body.name) || existing.name
  if ("category" in body) data.category = strOrNull(body.category)
  if ("entityId" in body) data.entityId = strOrNull(body.entityId)
  if ("department" in body) data.department = strOrNull(body.department)
  if ("visibleTo" in body) data.visibleTo = strOrNull(body.visibleTo) || "All Employees"
  if ("status" in body) data.status = strOrNull(body.status) || "Published"
  if ("fileUrl" in body) data.fileUrl = strOrNull(body.fileUrl)
  if ("fileExt" in body) data.fileExt = strOrNull(body.fileExt)
  if ("fileSize" in body) data.fileSize = toNum(body.fileSize)
  if ("version" in body) data.version = strOrNull(body.version)
  if ("description" in body) data.description = strOrNull(body.description)
  if ("remarks" in body) data.remarks = strOrNull(body.remarks)
  if ("uploadedBy" in body) data.uploadedBy = strOrNull(body.uploadedBy)
  if ("acknowledgmentDueDate" in body) data.acknowledgmentDueDate = toDate(body.acknowledgmentDueDate)
  const ack = toBool(body.acknowledgmentRequired)
  if (ack !== undefined) data.acknowledgmentRequired = ack

  // folderId can be set to null (move to root) or to a valid folder id
  if ("folderId" in body) {
    const fid = strOrNull(body.folderId)
    if (fid) {
      const rows = (await db.$queryRawUnsafe(
        `SELECT id FROM HRDocumentFolder WHERE id = ? AND tenantId = ? LIMIT 1`,
        fid, tenantId
      )) as { id: string }[]
      if (!rows[0]) return bad("Folder not found", 400)
      data.folderId = fid
    } else {
      data.folderId = null
    }
  }

  await rawUpdateHRDocument(id, data)

  const row = await rawGetHRDocument(tenantId, id)
  const rec = normalizeHRDoc(row!)
  await attachHRFolderInfo(tenantId, [rec])
  return ok(rec)
}

// DELETE — delete an HR document
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await rawGetHRDocument(tenantId, id)
  if (!existing) return bad("Document not found", 404)
  await rawDeleteHRDocument(id)
  return ok({ ok: true })
}
