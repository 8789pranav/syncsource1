// ============================================================================
//  Raw SQL helpers for EmployeeDocument + EmployeeDocumentFolder
// ----------------------------------------------------------------------------
//  These helpers exist because the long-running dev server's Prisma client
//  may not have been regenerated to know about the new `EmployeeDocumentFolder`
//  model or the new `folderId` / `uploadedBy` fields on `EmployeeDocument`
//  (Prisma generate updates the on-disk client, but Node's require cache for
//  `@prisma/client` persists for the lifetime of the dev server process).
//
//  Raw SQL goes straight to the SQLite driver, which has the new tables and
//  columns (we ran `prisma db:push` successfully). So raw queries bypass the
//  stale client-side schema validation entirely.
//
//  Once the dev server is restarted (next session), the regular Prisma ORM
//  delegates (`db.employeeDocumentFolder.*`, `db.employeeDocument.*` with the
//  new fields) will work and these helpers can be removed.
// ============================================================================
import { db } from "@/lib/db"

export interface RawFolderRow {
  id: string
  tenantId: string
  employeeId: string
  name: string
  description: string | null
  color: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface RawDocRow {
  id: string
  tenantId: string
  employeeId: string
  folderId: string | null
  name: string
  category: string | null
  documentType: string | null
  fileUrl: string | null
  fileExt: string | null
  fileSize: number | null
  status: string
  expiryDate: string | null
  uploadedAt: string
  uploadedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  remarks: string | null
  visibleToEmployee: number
  createdAt: string
  updatedAt: string
}

export interface RawFolderWithCount extends RawFolderRow {
  docCount: number
  lastActivityAt: string
}

// Generate a CUID-like id (good enough for raw inserts; collision-resistant)
export function newId(prefix = "rec"): string {
  const ts = Date.now().toString(36)
  const rnd = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${ts}-${rnd}`
}

// ---------- Documents ----------

export async function rawListEmployeeDocuments(
  tenantId: string,
  employeeId: string
): Promise<RawDocRow[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, tenantId, employeeId, folderId, name, category, documentType,
            fileUrl, fileExt, fileSize, status, expiryDate, uploadedAt, uploadedBy,
            approvedAt, approvedBy, remarks, visibleToEmployee, createdAt, updatedAt
     FROM EmployeeDocument
     WHERE tenantId = ? AND employeeId = ?
     ORDER BY uploadedAt DESC`,
    tenantId,
    employeeId
  )) as RawDocRow[]
  return rows
}

export async function rawListEmployeeDocumentsByFolder(
  tenantId: string,
  employeeId: string,
  folderId: string | null
): Promise<RawDocRow[]> {
  if (folderId) {
    return (await db.$queryRawUnsafe(
      `SELECT id, tenantId, employeeId, folderId, name, category, documentType,
              fileUrl, fileExt, fileSize, status, expiryDate, uploadedAt, uploadedBy,
              approvedAt, approvedBy, remarks, visibleToEmployee, createdAt, updatedAt
       FROM EmployeeDocument
       WHERE tenantId = ? AND employeeId = ? AND folderId = ?
       ORDER BY uploadedAt DESC`,
      tenantId, employeeId, folderId
    )) as RawDocRow[]
  }
  return (await db.$queryRawUnsafe(
    `SELECT id, tenantId, employeeId, folderId, name, category, documentType,
            fileUrl, fileExt, fileSize, status, expiryDate, uploadedAt, uploadedBy,
            approvedAt, approvedBy, remarks, visibleToEmployee, createdAt, updatedAt
     FROM EmployeeDocument
     WHERE tenantId = ? AND employeeId = ? AND folderId IS NULL
     ORDER BY uploadedAt DESC`,
    tenantId, employeeId
  )) as RawDocRow[]
}

export async function rawGetDocument(
  tenantId: string,
  employeeId: string,
  recordId: string
): Promise<RawDocRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, tenantId, employeeId, folderId, name, category, documentType,
            fileUrl, fileExt, fileSize, status, expiryDate, uploadedAt, uploadedBy,
            approvedAt, approvedBy, remarks, visibleToEmployee, createdAt, updatedAt
     FROM EmployeeDocument
     WHERE id = ? AND tenantId = ? AND employeeId = ?
     LIMIT 1`,
    recordId, tenantId, employeeId
  )) as RawDocRow[]
  return rows[0] || null
}

export async function rawCreateDocument(input: {
  tenantId: string
  employeeId: string
  folderId: string | null
  name: string
  category: string | null
  documentType: string | null
  fileUrl: string | null
  fileExt: string | null
  fileSize: number | null
  status: string
  expiryDate: Date | null
  uploadedBy: string
  approvedAt: Date | null
  approvedBy: string | null
  remarks: string | null
  visibleToEmployee: boolean
}): Promise<string> {
  const id = newId("doc")
  const now = new Date()
  await db.$executeRawUnsafe(
    `INSERT INTO EmployeeDocument
       (id, tenantId, employeeId, folderId, name, category, documentType,
        fileUrl, fileExt, fileSize, status, expiryDate, uploadedAt, uploadedBy,
        approvedAt, approvedBy, remarks, visibleToEmployee, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.tenantId,
    input.employeeId,
    input.folderId,
    input.name,
    input.category,
    input.documentType,
    input.fileUrl,
    input.fileExt,
    input.fileSize,
    input.status,
    input.expiryDate,
    now,
    input.uploadedBy,
    input.approvedAt,
    input.approvedBy,
    input.remarks,
    input.visibleToEmployee ? 1 : 0,
    now,
    now
  )
  return id
}

export async function rawUpdateDocument(
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const allowed = [
    "name", "category", "documentType", "fileUrl", "fileExt", "fileSize",
    "status", "expiryDate", "uploadedBy", "approvedAt", "approvedBy",
    "remarks", "visibleToEmployee", "folderId",
  ]
  const sets: string[] = []
  const params: unknown[] = []
  for (const k of allowed) {
    if (k in fields) {
      let v = fields[k]
      if (k === "visibleToEmployee" && typeof v === "boolean") v = v ? 1 : 0
      sets.push(`${k} = ?`)
      params.push(v)
    }
  }
  if (sets.length === 0) return
  sets.push(`updatedAt = ?`)
  params.push(new Date())
  params.push(recordId)
  await db.$executeRawUnsafe(
    `UPDATE EmployeeDocument SET ${sets.join(", ")} WHERE id = ?`,
    ...params
  )
}

export async function rawDeleteDocument(recordId: string): Promise<void> {
  await db.$executeRawUnsafe(`DELETE FROM EmployeeDocument WHERE id = ?`, recordId)
}

// ---------- Folders ----------

export async function rawListFolders(
  tenantId: string,
  employeeId: string
): Promise<RawFolderWithCount[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT f.id, f.tenantId, f.employeeId, f.name, f.description, f.color,
            f.createdBy, f.createdAt, f.updatedAt,
            (SELECT COUNT(*) FROM EmployeeDocument d WHERE d.folderId = f.id) AS docCount,
            COALESCE((SELECT MAX(d.uploadedAt) FROM EmployeeDocument d WHERE d.folderId = f.id), f.createdAt) AS lastActivityAt
     FROM EmployeeDocumentFolder f
     WHERE f.tenantId = ? AND f.employeeId = ?
     ORDER BY f.createdAt DESC`,
    tenantId, employeeId
  )) as RawFolderWithCount[]
  return rows
}

export async function rawGetFolder(
  tenantId: string,
  employeeId: string,
  folderId: string
): Promise<RawFolderRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, tenantId, employeeId, name, description, color, createdBy, createdAt, updatedAt
     FROM EmployeeDocumentFolder
     WHERE id = ? AND tenantId = ? AND employeeId = ?
     LIMIT 1`,
    folderId, tenantId, employeeId
  )) as RawFolderRow[]
  return rows[0] || null
}

export async function rawCreateFolder(input: {
  tenantId: string
  employeeId: string
  name: string
  description: string | null
  color: string | null
  createdBy: string
}): Promise<string> {
  const id = newId("fld")
  const now = new Date()
  await db.$executeRawUnsafe(
    `INSERT INTO EmployeeDocumentFolder
       (id, tenantId, employeeId, name, description, color, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.tenantId, input.employeeId, input.name, input.description,
    input.color, input.createdBy, now, now
  )
  return id
}

export async function rawUpdateFolder(
  folderId: string,
  fields: { name?: string; description?: string | null; color?: string | null }
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if ("name" in fields && fields.name !== undefined) { sets.push(`name = ?`); params.push(fields.name) }
  if ("description" in fields) { sets.push(`description = ?`); params.push(fields.description) }
  if ("color" in fields) { sets.push(`color = ?`); params.push(fields.color) }
  if (sets.length === 0) return
  sets.push(`updatedAt = ?`)
  params.push(new Date())
  params.push(folderId)
  await db.$executeRawUnsafe(
    `UPDATE EmployeeDocumentFolder SET ${sets.join(", ")} WHERE id = ?`,
    ...params
  )
}

export async function rawDeleteFolder(folderId: string): Promise<{ movedToRoot: number }> {
  // Count docs that will be moved to root
  const countRows = (await db.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM EmployeeDocument WHERE folderId = ?`,
    folderId
  )) as { cnt: bigint | number }[]
  const movedToRoot = Number(countRows[0]?.cnt ?? 0)
  // SetNull behaviour: clear folderId on all child docs
  if (movedToRoot > 0) {
    await db.$executeRawUnsafe(
      `UPDATE EmployeeDocument SET folderId = NULL, updatedAt = ? WHERE folderId = ?`,
      new Date(), folderId
    )
  }
  await db.$executeRawUnsafe(`DELETE FROM EmployeeDocumentFolder WHERE id = ?`, folderId)
  return { movedToRoot }
}

// ---------- Counts (for with-doc-counts endpoint) ----------

export async function rawFolderCountsByEmployee(
  tenantId: string
): Promise<Map<string, number>> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT employeeId, COUNT(*) AS cnt
     FROM EmployeeDocumentFolder
     WHERE tenantId = ?
     GROUP BY employeeId`,
    tenantId
  )) as { employeeId: string; cnt: bigint | number }[]
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.employeeId, Number(r.cnt))
  return m
}

// Convert raw date string (SQLite stores as ISO string) to a normalized string
export function isoOrNull(d: unknown): string | null {
  if (!d) return null
  if (d instanceof Date) return d.toISOString()
  if (typeof d === "string") {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  return null
}

// Normalise a raw doc row into a JSON-friendly shape with Date fields converted to ISO strings
export function normalizeDoc(row: RawDocRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    folderId: row.folderId,
    folder: null as { id: string; name: string; color: string | null } | null,
    name: row.name,
    category: row.category,
    documentType: row.documentType,
    fileUrl: row.fileUrl,
    fileExt: row.fileExt,
    fileSize: row.fileSize,
    status: row.status,
    expiryDate: isoOrNull(row.expiryDate),
    uploadedAt: isoOrNull(row.uploadedAt) || new Date().toISOString(),
    uploadedBy: row.uploadedBy,
    approvedAt: isoOrNull(row.approvedAt),
    approvedBy: row.approvedBy,
    remarks: row.remarks,
    visibleToEmployee: !!row.visibleToEmployee,
    createdAt: isoOrNull(row.createdAt) || new Date().toISOString(),
    updatedAt: isoOrNull(row.updatedAt) || new Date().toISOString(),
  }
}

export function normalizeFolder(row: RawFolderRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    name: row.name,
    description: row.description,
    color: row.color,
    createdBy: row.createdBy,
    createdAt: isoOrNull(row.createdAt) || new Date().toISOString(),
    updatedAt: isoOrNull(row.updatedAt) || new Date().toISOString(),
  }
}

// Attach folder info to a list of normalized docs (single batched query)
export async function attachFolderInfo(
  tenantId: string,
  docs: ReturnType<typeof normalizeDoc>[]
): Promise<void> {
  const folderIds = Array.from(new Set(docs.map(d => d.folderId).filter(Boolean))) as string[]
  if (folderIds.length === 0) return
  const placeholders = folderIds.map(() => "?").join(",")
  const rows = (await db.$queryRawUnsafe(
    `SELECT id, name, color FROM EmployeeDocumentFolder WHERE tenantId = ? AND id IN (${placeholders})`,
    tenantId, ...folderIds
  )) as { id: string; name: string; color: string | null }[]
  const m = new Map(rows.map(r => [r.id, r]))
  for (const d of docs) {
    if (d.folderId && m.has(d.folderId)) {
      d.folder = m.get(d.folderId)!
    }
  }
}
