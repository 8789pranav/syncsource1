import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"
import {
  rawListEmployeeDocuments, rawCreateDocument, normalizeDoc, attachFolderInfo,
} from "@/lib/employee-doc-raw"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rows = await rawListEmployeeDocuments(tenantId, id)
  const items = rows.map(normalizeDoc)
  await attachFolderInfo(tenantId, items)
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Document name is required")

  // Validate folderId belongs to this employee+tenant if provided.
  let folderId: string | null = strOrNull(body.folderId)
  if (folderId) {
    // Use a raw SQL check — the Prisma client may not know the new model.
    const rows = (await db.$queryRawUnsafe(
      `SELECT id FROM EmployeeDocumentFolder WHERE id = ? AND tenantId = ? AND employeeId = ? LIMIT 1`,
      folderId, tenantId, id
    )) as { id: string }[]
    if (!rows[0]) return bad("Folder not found for this employee", 400)
  } else {
    folderId = null
  }

  const uploadedBy = strOrNull(body.uploadedBy) || "HR Admin"

  const newId = await rawCreateDocument({
    tenantId,
    employeeId: id,
    folderId,
    name,
    category: strOrNull(body.category),
    documentType: strOrNull(body.documentType),
    fileUrl: strOrNull(body.fileUrl),
    fileExt: strOrNull(body.fileExt),
    fileSize: toNum(body.fileSize) ?? null,
    status: strOrNull(body.status) || "Uploaded",
    expiryDate: toDate(body.expiryDate),
    uploadedBy,
    approvedAt: toDate(body.approvedAt),
    approvedBy: strOrNull(body.approvedBy),
    remarks: strOrNull(body.remarks),
    visibleToEmployee: toBool(body.visibleToEmployee, true) ?? true,
  })

  // Read back the created row (raw, to include the new fields)
  const createdRows = (await db.$queryRawUnsafe(
    `SELECT id, tenantId, employeeId, folderId, name, category, documentType,
            fileUrl, fileExt, fileSize, status, expiryDate, uploadedAt, uploadedBy,
            approvedAt, approvedBy, remarks, visibleToEmployee, createdAt, updatedAt
     FROM EmployeeDocument WHERE id = ? LIMIT 1`,
    newId
  )) as any[]
  const rec: any = createdRows[0] ? normalizeDoc(createdRows[0]) : { id: newId, name }
  await attachFolderInfo(tenantId, [rec])

  await logTimeline({
    tenantId, employeeId: id, eventType: "Document uploaded",
    title: "Document uploaded",
    description: `${name}${rec.documentType ? ` (${rec.documentType})` : ""}`,
    actorName: uploadedBy,
    metadata: { documentId: rec.id, category: rec.category, status: rec.status, uploadedBy },
  })
  return created(rec)
}
