import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"
import {
  rawGetDocument, rawUpdateDocument, rawDeleteDocument, normalizeDoc, attachFolderInfo,
} from "@/lib/employee-doc-raw"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const row = await rawGetDocument(tenantId, id, recordId)
  if (!row) return bad("Document not found", 404)
  const rec = normalizeDoc(row)
  await attachFolderInfo(tenantId, [rec])
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await rawGetDocument(tenantId, id, recordId)
  if (!existing) return bad("Document not found", 404)
  const body = await parseBody(req)
  const fields: Record<string, unknown> = {}

  if ("name" in body) {
    const n = strOrNull(body.name)
    if (!n) return bad("Document name cannot be empty")
    fields.name = n
  }
  if ("category" in body) fields.category = strOrNull(body.category)
  if ("documentType" in body) fields.documentType = strOrNull(body.documentType)
  if ("fileUrl" in body) fields.fileUrl = strOrNull(body.fileUrl)
  if ("fileExt" in body) fields.fileExt = strOrNull(body.fileExt)
  if ("fileSize" in body) fields.fileSize = (body.fileSize === null || body.fileSize === undefined || body.fileSize === "") ? null : Number(body.fileSize)
  if ("expiryDate" in body) fields.expiryDate = toDate(body.expiryDate)
  if ("remarks" in body) fields.remarks = strOrNull(body.remarks)
  if ("uploadedBy" in body) fields.uploadedBy = strOrNull(body.uploadedBy)
  if ("visibleToEmployee" in body) {
    const b = toBool(body.visibleToEmployee)
    if (b !== undefined) fields.visibleToEmployee = b
  }
  if ("approvedBy" in body) fields.approvedBy = strOrNull(body.approvedBy)

  // folderId handling — support null (move to root) and a valid folder id
  if ("folderId" in body) {
    const v = body.folderId
    if (v === null || v === undefined || v === "") {
      fields.folderId = null
    } else {
      const fid = String(v)
      const rows = (await db.$queryRawUnsafe(
        `SELECT id FROM EmployeeDocumentFolder WHERE id = ? AND tenantId = ? AND employeeId = ? LIMIT 1`,
        fid, tenantId, id
      )) as { id: string }[]
      if (!rows[0]) return bad("Folder not found for this employee", 400)
      fields.folderId = fid
    }
  }

  // Status change to Approved/Rejected → stamp approvedAt + approvedBy
  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    fields.status = newStatus
    if (newStatus === "Approved") {
      fields.approvedAt = new Date()
      if (!("approvedBy" in fields)) fields.approvedBy = strOrNull(body.actorName) ?? "HR Admin"
    } else if (newStatus === "Rejected") {
      fields.approvedAt = null
      if (!("approvedBy" in fields)) fields.approvedBy = strOrNull(body.actorName) ?? "HR Admin"
    }
  }

  await rawUpdateDocument(recordId, fields)

  // Read back
  const updated = await rawGetDocument(tenantId, id, recordId)
  const rec = updated ? normalizeDoc(updated) : null
  if (rec) await attachFolderInfo(tenantId, [rec])

  // Timeline event for status transitions
  if (existing.status !== rec?.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Document ${(rec?.status || "").toLowerCase()}`,
      description: `${rec?.name} — ${rec?.documentType || rec?.category || ""}`.trim(),
      metadata: { documentId: recordId, oldStatus: existing.status, newStatus: rec?.status },
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await rawGetDocument(tenantId, id, recordId)
  if (!existing) return bad("Document not found", 404)
  await rawDeleteDocument(recordId)
  await logTimeline({
    tenantId, employeeId: id, eventType: "Document deleted",
    title: "Document deleted",
    description: `${existing.name}${existing.documentType ? ` (${existing.documentType})` : ""}`,
    metadata: { documentId: existing.id, deletedBy: "HR Admin" },
  })
  return ok({ ok: true })
}
