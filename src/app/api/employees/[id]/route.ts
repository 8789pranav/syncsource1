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
function toBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined
  if (typeof v === "boolean") return v
  const s = String(v).toLowerCase().trim()
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true
  if (s === "false" || s === "0" || s === "no" || s === "off") return false
  return undefined
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

// All Employee-model field names (used to decide what goes into customData).
const EMPLOYEE_FIELDS = new Set([
  "employeeCode", "firstName", "middleName", "lastName", "displayName", "gender",
  "dateOfBirth", "maritalStatus", "bloodGroup", "nationality", "religion", "category",
  "profilePhotoUrl", "personalEmail", "officialEmail", "mobileNumber", "alternateNumber",
  // Identity documents
  "passportNumber", "drivingLicense", "voterId", "physicallyDisabled", "disabilityDetails",
  // Employment
  "dateOfJoining", "employmentType", "workerType", "jobType", "probationStatus",
  "probationStartDate", "probationEndDate", "confirmationDate", "noticePeriod",
  "noticePeriodStartDate", "lastWorkingDate", "employeeStatus", "workMode",
  "businessUnit", "costCenter",
  // Organization
  "entityId", "branchId", "departmentId", "designationId", "gradeId", "locationId",
  "reportingManagerId", "functionalManagerId", "hrManagerId",
  // Policy assignments
  "leavePolicyId", "attendancePolicyId", "payrollPolicyId", "shiftPolicyId", "holidayCalendarId",
  // Bank
  "bankName", "accountHolderName", "accountNumber", "accountType", "ifscCode",
  "branchName", "upiId",
  // Statutory
  "panNumber", "aadhaarNumber", "uanNumber", "pfNumber", "esiNumber", "ptLocation",
  "pfApplicable", "esiApplicable", "ptApplicable", "lwfApplicability", "gratuityApplicability",
  "taxRegime", "tdsDeclarationStatus",
  // Address - current
  "currentAddress", "currentAddressLine2", "currentCity", "currentState",
  "currentCountry", "currentPincode", "currentLandmark",
  // Address - permanent
  "permanentAddress", "permanentAddressLine2", "permanentCity", "permanentState",
  "permanentCountry", "permanentPincode", "sameAsCurrent",
  // Emergency contact
  "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone",
  "emergencyContactAltPhone", "emergencyContactEmail", "emergencyContactAddress",
  "communicationPreference",
  // Compensation
  "ctc", "basicSalary", "hra", "specialAllowance", "conveyanceAllowance",
  "medicalAllowance", "bonusAmount", "pfEmployee", "pfEmployer", "esiAmount",
  "professionalTax", "tdsAmount", "grossSalary", "netSalary",
  // Exit
  "resignationDate", "resignationReason", "exitStatus",
])

type Ctx = { params: Promise<{ id: string }> }

// ---------- GET one (with all relations + _count for all sub-records) ----------
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
      _count: {
        select: {
          familyMembers: true,
          educationRecords: true,
          experienceRecords: true,
          bankHistory: true,
          statutoryDetails: true,
          documents: true,
          compensationHistory: true,
          notes: true,
          timelineEvents: true,
          auditLogs: true,
          statusHistory: true,
          transferHistory: true,
          promotionHistory: true,
          probationReviews: true,
          exitRecords: true,
          loginAccess: true,
          roleMappings: true,
          customFieldValues: true,
          formSubmissions: true,
          skills: true,
          certifications: true,
          trainings: true,
          performanceGoals: true,
          performanceReviews: true,
          expenses: true,
          helpdeskTickets: true,
          letters: true,
          requests: true,
        },
      },
    },
  })
  if (!rec) return bad("Employee not found", 404)

  // Resolve reporting manager, functional manager, hr manager (separate fetches — plain String FKs)
  const mgrSelect = { id: true, firstName: true, lastName: true, employeeCode: true, displayName: true } as const
  let reportingManager: { id: string; firstName: string; lastName: string | null; employeeCode: string; displayName: string | null } | null = null
  let functionalManager: { id: string; firstName: string; lastName: string | null; employeeCode: string; displayName: string | null } | null = null
  let hrManager: { id: string; firstName: string; lastName: string | null; employeeCode: string; displayName: string | null } | null = null
  if (rec.reportingManagerId) {
    reportingManager = await db.employee.findFirst({ where: { id: rec.reportingManagerId, tenantId }, select: mgrSelect })
  }
  if (rec.functionalManagerId) {
    functionalManager = await db.employee.findFirst({ where: { id: rec.functionalManagerId, tenantId }, select: mgrSelect })
  }
  if (rec.hrManagerId) {
    hrManager = await db.employee.findFirst({ where: { id: rec.hrManagerId, tenantId }, select: mgrSelect })
  }

  return ok({ ...rec, reportingManager, functionalManager, hrManager })
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
  const changed: { field: string; oldVal: string; newVal: string }[] = []

  function setField<T extends string | number | boolean | Date | null>(
    field: string,
    value: T | undefined,
    opts?: { module?: string; numeric?: boolean; date?: boolean; bool?: boolean }
  ) {
    if (value === undefined) return
    const oldVal = (existing as any)[field]
    if (oldVal === value) return
    // Normalize for comparison
    const normalize = (v: any) => {
      if (v instanceof Date) return v.toISOString()
      if (typeof v === "boolean") return String(v)
      if (v === null || v === undefined) return ""
      return String(v)
    }
    if (normalize(oldVal) === normalize(value)) return
    data[field] = value
    changed.push({
      field,
      oldVal: oldVal === null || oldVal === undefined ? "" : String(oldVal),
      newVal: value === null ? "" : String(value),
    })
    // module label for audit grouping
    if (opts?.module) (changed[changed.length - 1] as any).module = opts.module
  }

  // --- Basic ---
  if ("employeeCode" in body) setField("employeeCode", str(body.employeeCode).trim(), { module: "Personal" })
  if ("firstName" in body) setField("firstName", str(body.firstName).trim(), { module: "Personal" })
  if ("middleName" in body) setField("middleName", strOrNull(body.middleName), { module: "Personal" })
  if ("lastName" in body) setField("lastName", strOrNull(body.lastName), { module: "Personal" })
  if ("displayName" in body) setField("displayName", strOrNull(body.displayName), { module: "Personal" })
  if ("gender" in body) setField("gender", strOrNull(body.gender), { module: "Personal" })
  if ("dateOfBirth" in body) setField("dateOfBirth", toDate(body.dateOfBirth), { module: "Personal" })
  if ("maritalStatus" in body) setField("maritalStatus", strOrNull(body.maritalStatus), { module: "Personal" })
  if ("bloodGroup" in body) setField("bloodGroup", strOrNull(body.bloodGroup), { module: "Personal" })
  if ("nationality" in body) setField("nationality", str(body.nationality, "Indian"), { module: "Personal" })
  if ("religion" in body) setField("religion", strOrNull(body.religion), { module: "Personal" })
  if ("category" in body) setField("category", strOrNull(body.category), { module: "Personal" })
  if ("profilePhotoUrl" in body) setField("profilePhotoUrl", strOrNull(body.profilePhotoUrl), { module: "Personal" })
  if ("personalEmail" in body) setField("personalEmail", strOrNull(body.personalEmail), { module: "Personal" })
  if ("officialEmail" in body) setField("officialEmail", strOrNull(body.officialEmail), { module: "Personal" })
  if ("mobileNumber" in body) setField("mobileNumber", strOrNull(body.mobileNumber), { module: "Personal" })
  if ("alternateNumber" in body) setField("alternateNumber", strOrNull(body.alternateNumber), { module: "Personal" })

  // --- Identity documents ---
  if ("passportNumber" in body) setField("passportNumber", strOrNull(body.passportNumber), { module: "Personal" })
  if ("drivingLicense" in body) setField("drivingLicense", strOrNull(body.drivingLicense), { module: "Personal" })
  if ("voterId" in body) setField("voterId", strOrNull(body.voterId), { module: "Personal" })
  if ("physicallyDisabled" in body) {
    const b = toBool(body.physicallyDisabled)
    if (b !== undefined) setField("physicallyDisabled", b, { module: "Personal" })
  }
  if ("disabilityDetails" in body) setField("disabilityDetails", strOrNull(body.disabilityDetails), { module: "Personal" })

  // --- Employment ---
  if ("dateOfJoining" in body) setField("dateOfJoining", toDate(body.dateOfJoining), { module: "Job" })
  if ("employmentType" in body) setField("employmentType", str(body.employmentType, "Full-time"), { module: "Job" })
  if ("workerType" in body) setField("workerType", str(body.workerType, "Permanent"), { module: "Job" })
  if ("jobType" in body) setField("jobType", strOrNull(body.jobType), { module: "Job" })
  if ("probationStatus" in body) setField("probationStatus", strOrNull(body.probationStatus), { module: "Job" })
  if ("probationStartDate" in body) setField("probationStartDate", toDate(body.probationStartDate), { module: "Job" })
  if ("probationEndDate" in body) setField("probationEndDate", toDate(body.probationEndDate), { module: "Job" })
  if ("confirmationDate" in body) setField("confirmationDate", toDate(body.confirmationDate), { module: "Job" })
  if ("noticePeriod" in body) {
    const n = toNum(body.noticePeriod)
    if (n !== undefined) setField("noticePeriod", n, { module: "Job" })
  }
  if ("noticePeriodStartDate" in body) setField("noticePeriodStartDate", toDate(body.noticePeriodStartDate), { module: "Job" })
  if ("lastWorkingDate" in body) setField("lastWorkingDate", toDate(body.lastWorkingDate), { module: "Job" })

  const oldStatus = existing.employeeStatus
  const newStatus = body.employeeStatus !== undefined ? str(body.employeeStatus, "Active") : oldStatus
  if ("employeeStatus" in body) setField("employeeStatus", newStatus, { module: "Job" })

  if ("workMode" in body) setField("workMode", str(body.workMode, "Work from office"), { module: "Job" })
  if ("businessUnit" in body) setField("businessUnit", strOrNull(body.businessUnit), { module: "Job" })
  if ("costCenter" in body) setField("costCenter", strOrNull(body.costCenter), { module: "Job" })

  // --- Organization ---
  if ("entityId" in body) setField("entityId", strOrNull(body.entityId), { module: "Job" })
  if ("branchId" in body) setField("branchId", strOrNull(body.branchId), { module: "Job" })
  if ("departmentId" in body) setField("departmentId", strOrNull(body.departmentId), { module: "Job" })
  if ("designationId" in body) setField("designationId", strOrNull(body.designationId), { module: "Job" })
  if ("gradeId" in body) setField("gradeId", strOrNull(body.gradeId), { module: "Job" })
  if ("locationId" in body) setField("locationId", strOrNull(body.locationId), { module: "Job" })
  if ("reportingManagerId" in body) setField("reportingManagerId", strOrNull(body.reportingManagerId), { module: "Job" })
  if ("functionalManagerId" in body) setField("functionalManagerId", strOrNull(body.functionalManagerId), { module: "Job" })
  if ("hrManagerId" in body) setField("hrManagerId", strOrNull(body.hrManagerId), { module: "Job" })

  // --- Policy assignments ---
  if ("leavePolicyId" in body) setField("leavePolicyId", strOrNull(body.leavePolicyId), { module: "Job" })
  if ("attendancePolicyId" in body) setField("attendancePolicyId", strOrNull(body.attendancePolicyId), { module: "Job" })
  if ("payrollPolicyId" in body) setField("payrollPolicyId", strOrNull(body.payrollPolicyId), { module: "Job" })
  if ("shiftPolicyId" in body) setField("shiftPolicyId", strOrNull(body.shiftPolicyId), { module: "Job" })
  if ("holidayCalendarId" in body) setField("holidayCalendarId", strOrNull(body.holidayCalendarId), { module: "Job" })

  // --- Bank ---
  if ("bankName" in body) setField("bankName", strOrNull(body.bankName), { module: "Bank" })
  if ("accountHolderName" in body) setField("accountHolderName", strOrNull(body.accountHolderName), { module: "Bank" })
  if ("accountNumber" in body) setField("accountNumber", strOrNull(body.accountNumber), { module: "Bank" })
  if ("accountType" in body) setField("accountType", strOrNull(body.accountType), { module: "Bank" })
  if ("ifscCode" in body) setField("ifscCode", strOrNull(body.ifscCode), { module: "Bank" })
  if ("branchName" in body) setField("branchName", strOrNull(body.branchName), { module: "Bank" })
  if ("upiId" in body) setField("upiId", strOrNull(body.upiId), { module: "Bank" })

  // --- Statutory ---
  if ("panNumber" in body) setField("panNumber", strOrNull(body.panNumber), { module: "Statutory" })
  if ("aadhaarNumber" in body) setField("aadhaarNumber", strOrNull(body.aadhaarNumber), { module: "Statutory" })
  if ("uanNumber" in body) setField("uanNumber", strOrNull(body.uanNumber), { module: "Statutory" })
  if ("pfNumber" in body) setField("pfNumber", strOrNull(body.pfNumber), { module: "Statutory" })
  if ("esiNumber" in body) setField("esiNumber", strOrNull(body.esiNumber), { module: "Statutory" })
  if ("ptLocation" in body) setField("ptLocation", strOrNull(body.ptLocation), { module: "Statutory" })
  if ("pfApplicable" in body) {
    const b = toBool(body.pfApplicable)
    if (b !== undefined) setField("pfApplicable", b, { module: "Statutory" })
  }
  if ("esiApplicable" in body) {
    const b = toBool(body.esiApplicable)
    if (b !== undefined) setField("esiApplicable", b, { module: "Statutory" })
  }
  if ("ptApplicable" in body) {
    const b = toBool(body.ptApplicable)
    if (b !== undefined) setField("ptApplicable", b, { module: "Statutory" })
  }
  if ("lwfApplicability" in body) setField("lwfApplicability", strOrNull(body.lwfApplicability), { module: "Statutory" })
  if ("gratuityApplicability" in body) setField("gratuityApplicability", strOrNull(body.gratuityApplicability), { module: "Statutory" })
  if ("taxRegime" in body) setField("taxRegime", strOrNull(body.taxRegime), { module: "Statutory" })
  if ("tdsDeclarationStatus" in body) setField("tdsDeclarationStatus", strOrNull(body.tdsDeclarationStatus), { module: "Statutory" })

  // --- Current Address ---
  if ("currentAddress" in body) setField("currentAddress", strOrNull(body.currentAddress), { module: "Personal" })
  if ("currentAddressLine2" in body) setField("currentAddressLine2", strOrNull(body.currentAddressLine2), { module: "Personal" })
  if ("currentCity" in body) setField("currentCity", strOrNull(body.currentCity), { module: "Personal" })
  if ("currentState" in body) setField("currentState", strOrNull(body.currentState), { module: "Personal" })
  if ("currentCountry" in body) setField("currentCountry", strOrNull(body.currentCountry), { module: "Personal" })
  if ("currentPincode" in body) setField("currentPincode", strOrNull(body.currentPincode), { module: "Personal" })
  if ("currentLandmark" in body) setField("currentLandmark", strOrNull(body.currentLandmark), { module: "Personal" })

  // --- Permanent Address ---
  if ("permanentAddress" in body) setField("permanentAddress", strOrNull(body.permanentAddress), { module: "Personal" })
  if ("permanentAddressLine2" in body) setField("permanentAddressLine2", strOrNull(body.permanentAddressLine2), { module: "Personal" })
  if ("permanentCity" in body) setField("permanentCity", strOrNull(body.permanentCity), { module: "Personal" })
  if ("permanentState" in body) setField("permanentState", strOrNull(body.permanentState), { module: "Personal" })
  if ("permanentCountry" in body) setField("permanentCountry", strOrNull(body.permanentCountry), { module: "Personal" })
  if ("permanentPincode" in body) setField("permanentPincode", strOrNull(body.permanentPincode), { module: "Personal" })
  if ("sameAsCurrent" in body) {
    const b = toBool(body.sameAsCurrent)
    if (b !== undefined) setField("sameAsCurrent", b, { module: "Personal" })
  }

  // --- Emergency contact ---
  if ("emergencyContactName" in body) setField("emergencyContactName", strOrNull(body.emergencyContactName), { module: "Personal" })
  if ("emergencyContactRelation" in body) setField("emergencyContactRelation", strOrNull(body.emergencyContactRelation), { module: "Personal" })
  if ("emergencyContactPhone" in body) setField("emergencyContactPhone", strOrNull(body.emergencyContactPhone), { module: "Personal" })
  if ("emergencyContactAltPhone" in body) setField("emergencyContactAltPhone", strOrNull(body.emergencyContactAltPhone), { module: "Personal" })
  if ("emergencyContactEmail" in body) setField("emergencyContactEmail", strOrNull(body.emergencyContactEmail), { module: "Personal" })
  if ("emergencyContactAddress" in body) setField("emergencyContactAddress", strOrNull(body.emergencyContactAddress), { module: "Personal" })
  if ("communicationPreference" in body) setField("communicationPreference", strOrNull(body.communicationPreference), { module: "Personal" })

  // --- Compensation ---
  const compFields = ["ctc", "basicSalary", "hra", "specialAllowance", "conveyanceAllowance", "medicalAllowance", "bonusAmount", "pfEmployee", "pfEmployer", "esiAmount", "professionalTax", "tdsAmount", "grossSalary", "netSalary"]
  for (const f of compFields) {
    if (f in body) {
      const n = toFloat(body[f])
      if (n !== undefined) setField(f, n, { module: "Compensation" })
    }
  }

  // --- Exit ---
  if ("resignationDate" in body) setField("resignationDate", toDate(body.resignationDate), { module: "Job" })
  if ("resignationReason" in body) setField("resignationReason", strOrNull(body.resignationReason), { module: "Job" })
  if ("exitStatus" in body) setField("exitStatus", strOrNull(body.exitStatus), { module: "Job" })

  // Refresh customData with any non-model extras present in body
  const extras: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EMPLOYEE_FIELDS.has(k)) extras[k] = v
  }
  if (Object.keys(extras).length) {
    data.customData = JSON.stringify(extras)
  }

  // ---------- Audit + history records ----------
  const actorName = str(body.actorName, "HR Admin")
  const ipAddress = strOrNull(body.ipAddress)
  const userAgent = strOrNull(body.userAgent)

  if (Object.keys(data).length === 0) {
    // Nothing to update — return existing as-is.
    return ok(existing)
  }

  const updated = await db.employee.update({ where: { id }, data })

  // 1. Audit log entries (one row per changed field, plus one "summary" row)
  if (changed.length) {
    await db.employeeAuditLog.createMany({
      data: changed.map((c) => ({
        tenantId,
        employeeId: id,
        module: (c as any).module || "Personal",
        field: c.field,
        oldValue: c.oldVal,
        newValue: c.newVal,
        action: "Update",
        changedBy: actorName,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      })),
    })
  }

  // 2. Status history (when employeeStatus changed)
  if (newStatus !== oldStatus) {
    await db.employeeStatusHistory.create({
      data: {
        tenantId,
        employeeId: id,
        oldStatus: oldStatus,
        newStatus: newStatus,
        effectiveDate: new Date(),
        reason: strOrNull(body.statusChangeReason) || strOrNull(body.reason) || null,
        changedBy: actorName,
      },
    })
    await db.employeeTimelineEvent.create({
      data: {
        tenantId,
        employeeId: id,
        eventType: "Status changed",
        title: `Status changed from "${oldStatus}" to "${newStatus}"`,
        description: strOrNull(body.statusChangeReason) || undefined,
        eventDate: new Date(),
        actorName,
        metadata: JSON.stringify({ oldStatus, newStatus }),
      },
    })
  }

  // 3. Transfer history (when key org fields change)
  const transferFields = ["departmentId", "locationId", "entityId", "reportingManagerId"]
  const transferChanged = changed.some((c) => transferFields.includes(c.field))
  if (transferChanged) {
    const [oldDept, newDept, oldLoc, newLoc, oldMgr, newMgr, oldEntity, newEntity] = await Promise.all([
      existing.departmentId ? db.department.findUnique({ where: { id: existing.departmentId }, select: { name: true } }) : null,
      updated.departmentId ? db.department.findUnique({ where: { id: updated.departmentId }, select: { name: true } }) : null,
      existing.locationId ? db.location.findUnique({ where: { id: existing.locationId }, select: { name: true } }) : null,
      updated.locationId ? db.location.findUnique({ where: { id: updated.locationId }, select: { name: true } }) : null,
      existing.reportingManagerId ? db.employee.findUnique({ where: { id: existing.reportingManagerId }, select: { firstName: true, lastName: true } }) : null,
      updated.reportingManagerId ? db.employee.findUnique({ where: { id: updated.reportingManagerId }, select: { firstName: true, lastName: true } }) : null,
      existing.entityId ? db.entity.findUnique({ where: { id: existing.entityId }, select: { tradeName: true, legalName: true } }) : null,
      updated.entityId ? db.entity.findUnique({ where: { id: updated.entityId }, select: { tradeName: true, legalName: true } }) : null,
    ])
    await db.employeeTransferHistory.create({
      data: {
        tenantId,
        employeeId: id,
        oldDepartment: oldDept?.name || null,
        newDepartment: newDept?.name || null,
        oldLocation: oldLoc?.name || null,
        newLocation: newLoc?.name || null,
        oldManager: oldMgr ? `${oldMgr.firstName} ${oldMgr.lastName || ""}`.trim() : null,
        newManager: newMgr ? `${newMgr.firstName} ${newMgr.lastName || ""}`.trim() : null,
        oldEntity: oldEntity?.tradeName || oldEntity?.legalName || null,
        newEntity: newEntity?.tradeName || newEntity?.legalName || null,
        effectiveDate: new Date(),
        reason: strOrNull(body.transferReason) || "Organizational update",
        status: "Approved",
        approvedBy: actorName,
      },
    })
    await db.employeeTimelineEvent.create({
      data: {
        tenantId,
        employeeId: id,
        eventType: "Transferred",
        title: "Transferred",
        description: [
          oldDept?.name && newDept?.name && oldDept.name !== newDept.name ? `Department: ${oldDept.name} → ${newDept.name}` : null,
          oldLoc?.name && newLoc?.name && oldLoc.name !== newLoc.name ? `Location: ${oldLoc.name} → ${newLoc.name}` : null,
          oldEntity?.tradeName && newEntity?.tradeName && oldEntity.tradeName !== newEntity.tradeName ? `Entity: ${oldEntity.tradeName} → ${newEntity.tradeName}` : null,
        ].filter(Boolean).join("; ") || "Organizational transfer",
        eventDate: new Date(),
        actorName,
      },
    })
  }

  // 4. Promotion history (designationId/gradeId/ctc change together)
  const desigChanged = changed.some((c) => c.field === "designationId")
  const gradeChanged = changed.some((c) => c.field === "gradeId")
  const ctcChanged = changed.some((c) => c.field === "ctc")
  if (desigChanged || (gradeChanged && ctcChanged)) {
    const [oldDesig, newDesig, oldGrade, newGrade] = await Promise.all([
      existing.designationId ? db.designation.findUnique({ where: { id: existing.designationId }, select: { name: true } }) : null,
      updated.designationId ? db.designation.findUnique({ where: { id: updated.designationId }, select: { name: true } }) : null,
      existing.gradeId ? db.grade.findUnique({ where: { id: existing.gradeId }, select: { name: true } }) : null,
      updated.gradeId ? db.grade.findUnique({ where: { id: updated.gradeId }, select: { name: true } }) : null,
    ])
    await db.employeePromotionHistory.create({
      data: {
        tenantId,
        employeeId: id,
        oldDesignation: oldDesig?.name || null,
        newDesignation: newDesig?.name || null,
        oldGrade: oldGrade?.name || null,
        newGrade: newGrade?.name || null,
        oldCtc: existing.ctc,
        newCtc: updated.ctc,
        effectiveDate: new Date(),
        reason: strOrNull(body.promotionReason) || "Designation/grade change",
        status: "Approved",
        approvedBy: actorName,
      },
    })
    await db.employeeTimelineEvent.create({
      data: {
        tenantId,
        employeeId: id,
        eventType: "Promoted",
        title: "Promoted",
        description: [
          oldDesig?.name && newDesig?.name && oldDesig.name !== newDesig.name ? `Designation: ${oldDesig.name} → ${newDesig.name}` : null,
          oldGrade?.name && newGrade?.name && oldGrade.name !== newGrade.name ? `Grade: ${oldGrade.name} → ${newGrade.name}` : null,
        ].filter(Boolean).join("; ") || "Promotion",
        eventDate: new Date(),
        actorName,
      },
    })
  }

  // 5. Compensation history (when ctc/basicSalary/hra change)
  if (ctcChanged || changed.some((c) => ["basicSalary", "hra"].includes(c.field))) {
    await db.employeeCompensationHistory.create({
      data: {
        tenantId,
        employeeId: id,
        effectiveDate: new Date(),
        oldCtc: existing.ctc,
        newCtc: updated.ctc,
        oldBasic: existing.basicSalary,
        newBasic: updated.basicSalary,
        oldHra: existing.hra,
        newHra: updated.hra,
        incrementPercent:
          existing.ctc && updated.ctc && existing.ctc > 0
            ? Number((((updated.ctc - existing.ctc) / existing.ctc) * 100).toFixed(2))
            : null,
        revisionReason: strOrNull(body.revisionReason) || (desigChanged ? "Promotion" : "Off-cycle revision"),
        approvedBy: actorName,
        status: "Approved",
      },
    })
    await db.employeeTimelineEvent.create({
      data: {
        tenantId,
        employeeId: id,
        eventType: "Salary revised",
        title: "Salary revised",
        description: `CTC revised from ₹${existing.ctc ?? 0} to ₹${updated.ctc ?? 0}`,
        eventDate: new Date(),
        actorName,
      },
    })
  }

  // 6. Manager-changed timeline (when reportingManager changed but no other transfer fields)
  if (changed.some((c) => c.field === "reportingManagerId") && !transferChanged) {
    // already covered by transfer history above; if only manager changed, transferChanged = true anyway.
  }

  // 7. Generic "Profile updated" timeline (only if no significant event was already logged)
  const significantLogged =
    newStatus !== oldStatus || transferChanged || desigChanged || (gradeChanged && ctcChanged) || ctcChanged
  if (!significantLogged && changed.length) {
    await db.employeeTimelineEvent.create({
      data: {
        tenantId,
        employeeId: id,
        eventType: "Profile updated",
        title: "Profile updated",
        description: `Updated: ${changed.map((c) => c.field).join(", ")}`,
        eventDate: new Date(),
        actorName,
      },
    })
  }

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
