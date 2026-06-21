import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

// ---------- helpers (mirrored) ----------
function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
function toFloat(v: unknown): number | undefined {
  return toNum(v)
}
function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}
function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

const EMPLOYEE_FIELDS = new Set([
  "employeeCode", "firstName", "middleName", "lastName", "displayName", "gender",
  "dateOfBirth", "maritalStatus", "bloodGroup", "nationality", "profilePhotoUrl",
  "personalEmail", "officialEmail", "mobileNumber", "alternateNumber",
  "dateOfJoining", "employmentType", "workerType", "probationStatus", "probationEndDate",
  "confirmationDate", "noticePeriod", "employeeStatus",
  "entityId", "branchId", "departmentId", "designationId", "gradeId", "locationId",
  "reportingManagerId",
  "bankName", "accountNumber", "ifscCode", "branchName",
  "panNumber", "aadhaarNumber", "uanNumber", "pfNumber", "esiNumber",
  "currentAddress", "permanentAddress",
  "ctc", "basicSalary", "hra",
])

type Ctx = { params: Promise<{ id: string }> }

// ---------- GET one (with all relations) ----------
export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.employee.findFirst({
    where: { id, tenantId },
    include: {
      entity: { select: { id: true, code: true, legalName: true, tradeName: true } },
      branch: { select: { id: true, code: true, name: true, city: true } },
      department: { select: { id: true, code: true, name: true } },
      designation: { select: { id: true, code: true, name: true } },
      grade: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
      location: { select: { id: true, code: true, name: true, city: true, attendanceMode: true } },
    },
  })
  if (!rec) return bad("Employee not found", 404)

  // Resolve reporting manager (separate fetch so we don't self-include)
  let reportingManager: { id: string; firstName: string; lastName: string | null; employeeCode: string } | null = null
  if (rec.reportingManagerId) {
    reportingManager = await db.employee.findFirst({
      where: { id: rec.reportingManagerId, tenantId },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    })
  }

  return ok({ ...rec, reportingManager })
}

// ---------- PATCH update ----------
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await parseBody(req)
  const existing = await db.employee.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Employee not found", 404)

  if (body.employeeCode !== undefined) {
    const newCode = str(body.employeeCode).trim()
    if (!newCode) return bad("Employee code cannot be empty")
    if (newCode !== existing.employeeCode) {
      const clash = await db.employee.findUnique({ where: { tenantId_employeeCode: { tenantId, employeeCode: newCode } } })
      if (clash) return bad("Employee code already exists", 409)
    }
  }

  const data: Record<string, unknown> = {}
  if ("employeeCode" in body) data.employeeCode = str(body.employeeCode).trim()
  if ("firstName" in body) data.firstName = str(body.firstName).trim()
  if ("middleName" in body) data.middleName = strOrNull(body.middleName)
  if ("lastName" in body) data.lastName = strOrNull(body.lastName)
  if ("displayName" in body) data.displayName = strOrNull(body.displayName)
  if ("gender" in body) data.gender = strOrNull(body.gender)
  if ("dateOfBirth" in body) data.dateOfBirth = toDate(body.dateOfBirth)
  if ("maritalStatus" in body) data.maritalStatus = strOrNull(body.maritalStatus)
  if ("bloodGroup" in body) data.bloodGroup = strOrNull(body.bloodGroup)
  if ("nationality" in body) data.nationality = str(body.nationality, "Indian")
  if ("profilePhotoUrl" in body) data.profilePhotoUrl = strOrNull(body.profilePhotoUrl)
  if ("personalEmail" in body) data.personalEmail = strOrNull(body.personalEmail)
  if ("officialEmail" in body) data.officialEmail = strOrNull(body.officialEmail)
  if ("mobileNumber" in body) data.mobileNumber = strOrNull(body.mobileNumber)
  if ("alternateNumber" in body) data.alternateNumber = strOrNull(body.alternateNumber)
  if ("dateOfJoining" in body) data.dateOfJoining = toDate(body.dateOfJoining)
  if ("employmentType" in body) data.employmentType = str(body.employmentType, "Full-time")
  if ("workerType" in body) data.workerType = str(body.workerType, "Permanent")
  if ("probationStatus" in body) data.probationStatus = strOrNull(body.probationStatus)
  if ("probationEndDate" in body) data.probationEndDate = toDate(body.probationEndDate)
  if ("confirmationDate" in body) data.confirmationDate = toDate(body.confirmationDate)
  if ("noticePeriod" in body) data.noticePeriod = toNum(body.noticePeriod)
  if ("employeeStatus" in body) data.employeeStatus = str(body.employeeStatus, "Active")
  if ("entityId" in body) data.entityId = strOrNull(body.entityId)
  if ("branchId" in body) data.branchId = strOrNull(body.branchId)
  if ("departmentId" in body) data.departmentId = strOrNull(body.departmentId)
  if ("designationId" in body) data.designationId = strOrNull(body.designationId)
  if ("gradeId" in body) data.gradeId = strOrNull(body.gradeId)
  if ("locationId" in body) data.locationId = strOrNull(body.locationId)
  if ("reportingManagerId" in body) data.reportingManagerId = strOrNull(body.reportingManagerId)
  if ("bankName" in body) data.bankName = strOrNull(body.bankName)
  if ("accountNumber" in body) data.accountNumber = strOrNull(body.accountNumber)
  if ("ifscCode" in body) data.ifscCode = strOrNull(body.ifscCode)
  if ("branchName" in body) data.branchName = strOrNull(body.branchName)
  if ("panNumber" in body) data.panNumber = strOrNull(body.panNumber)
  if ("aadhaarNumber" in body) data.aadhaarNumber = strOrNull(body.aadhaarNumber)
  if ("uanNumber" in body) data.uanNumber = strOrNull(body.uanNumber)
  if ("pfNumber" in body) data.pfNumber = strOrNull(body.pfNumber)
  if ("esiNumber" in body) data.esiNumber = strOrNull(body.esiNumber)
  if ("currentAddress" in body) data.currentAddress = strOrNull(body.currentAddress)
  if ("permanentAddress" in body) data.permanentAddress = strOrNull(body.permanentAddress)
  if ("ctc" in body) data.ctc = toFloat(body.ctc)
  if ("basicSalary" in body) data.basicSalary = toFloat(body.basicSalary)
  if ("hra" in body) data.hra = toFloat(body.hra)

  // Refresh customData with any non-model extras present in body
  const extras: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EMPLOYEE_FIELDS.has(k)) extras[k] = v
  }
  if (Object.keys(extras).length) {
    data.customData = JSON.stringify(extras)
  }

  const updated = await db.employee.update({ where: { id }, data })
  return ok(updated)
}

// ---------- DELETE ----------
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.employee.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Employee not found", 404)
  await db.employee.delete({ where: { id } })
  return ok({ ok: true })
}
