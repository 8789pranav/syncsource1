import { employeeRepository, EmployeeCreateData } from "@/lib/repositories/employee.repository"
import { auditRepository } from "@/lib/repositories/dashboard.repository"
import { toDate, toFloat, strOrNull, str } from "@/lib/validation"
import { db } from "@/lib/db"

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

export interface EmployeeListParams {
  tenantId: string
  q?: string
  departmentId?: string
  entityId?: string
  branchId?: string
  status?: string
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export const employeeService = {
  async list(params: EmployeeListParams) {
    const { items, total } = await employeeRepository.findMany({
      tenantId: params.tenantId,
      q: params.q,
      departmentId: params.departmentId,
      entityId: params.entityId,
      branchId: params.branchId,
      status: params.status,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })
    return { items, total, page: params.page, pageSize: params.pageSize }
  },

  async getById(id: string, tenantId: string) {
    const rec = await employeeRepository.findById(id, tenantId)
    if (!rec) return null

    const mgrSelect = { id: true, firstName: true, lastName: true, employeeCode: true, displayName: true } as const
    let reportingManager = null
    let functionalManager = null
    let hrManager = null

    if (rec.reportingManagerId) {
      reportingManager = await db.employee.findFirst({ where: { id: rec.reportingManagerId, tenantId }, select: mgrSelect })
    }
    if (rec.functionalManagerId) {
      functionalManager = await db.employee.findFirst({ where: { id: rec.functionalManagerId, tenantId }, select: mgrSelect })
    }
    if (rec.hrManagerId) {
      hrManager = await db.employee.findFirst({ where: { id: rec.hrManagerId, tenantId }, select: mgrSelect })
    }

    return { ...rec, reportingManager, functionalManager, hrManager }
  },

  async create(body: Record<string, unknown>, tenantId: string, actorName?: string) {
    const employeeCode = str(body.employeeCode).trim()
    const firstName = str(body.firstName).trim()
    if (!employeeCode) throw new ServiceError("Employee code is required", 400)
    if (!firstName) throw new ServiceError("First name is required", 400)

    const existing = await employeeRepository.findByCode(tenantId, employeeCode)
    if (existing) throw new ServiceError("Employee code already exists", 409)

    const extras: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (!EMPLOYEE_FIELDS.has(k)) extras[k] = v
    }
    const customData = Object.keys(extras).length ? JSON.stringify(extras) : null

    const data: EmployeeCreateData = {
      tenantId,
      employeeCode,
      firstName,
      middleName: strOrNull(body.middleName),
      lastName: strOrNull(body.lastName),
      displayName: strOrNull(body.displayName),
      gender: strOrNull(body.gender),
      dateOfBirth: toDate(body.dateOfBirth),
      maritalStatus: strOrNull(body.maritalStatus),
      bloodGroup: strOrNull(body.bloodGroup),
      nationality: str(body.nationality, "Indian"),
      personalEmail: strOrNull(body.personalEmail),
      officialEmail: strOrNull(body.officialEmail),
      mobileNumber: strOrNull(body.mobileNumber),
      alternateNumber: strOrNull(body.alternateNumber),
      dateOfJoining: toDate(body.dateOfJoining),
      employmentType: str(body.employmentType, "Full-time"),
      workerType: str(body.workerType, "Permanent"),
      employeeStatus: str(body.employeeStatus, "Active"),
      entityId: strOrNull(body.entityId),
      branchId: strOrNull(body.branchId),
      departmentId: strOrNull(body.departmentId),
      designationId: strOrNull(body.designationId),
      gradeId: strOrNull(body.gradeId),
      locationId: strOrNull(body.locationId),
      reportingManagerId: strOrNull(body.reportingManagerId),
      bankName: strOrNull(body.bankName),
      accountNumber: strOrNull(body.accountNumber),
      ifscCode: strOrNull(body.ifscCode),
      panNumber: strOrNull(body.panNumber),
      aadhaarNumber: strOrNull(body.aadhaarNumber),
      ctc: toFloat(body.ctc),
      basicSalary: toFloat(body.basicSalary),
      hra: toFloat(body.hra),
      customData,
    }

    const rec = await employeeRepository.create(data)

    await auditRepository.log({
      tenantId,
      module: "employees",
      action: "Create",
      recordId: rec.id,
      userName: actorName,
      details: JSON.stringify({ employeeCode, firstName }),
    })

    await db.employeeTimelineEvent.create({
      data: {
        tenantId,
        employeeId: rec.id,
        eventType: "Created",
        title: "Employee record created",
        eventDate: new Date(),
        actorName: actorName || "System",
      },
    })

    return rec
  },

  async update(id: string, body: Record<string, unknown>, tenantId: string, actorName?: string) {
    const existing = await db.employee.findFirst({ where: { id, tenantId } })
    if (!existing) throw new ServiceError("Employee not found", 404)

    if (body.employeeCode !== undefined) {
      const newCode = str(body.employeeCode).trim()
      if (!newCode) throw new ServiceError("Employee code cannot be empty", 400)
      if (newCode !== existing.employeeCode) {
        const clash = await employeeRepository.findByCode(tenantId, newCode)
        if (clash) throw new ServiceError("Employee code already exists", 409)
      }
    }

    const data: Record<string, unknown> = {}
    const changed: { field: string; oldVal: string; newVal: string; module?: string }[] = []

    function setField<T extends string | number | boolean | Date | null>(
      field: string,
      value: T | undefined,
      opts?: { module?: string }
    ) {
      if (value === undefined) return
      const oldVal = (existing as any)[field]
      if (oldVal === value) return
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
        module: opts?.module,
      })
    }

    const fieldMap: [string, () => any, string][] = [
      ["employeeCode", () => str(body.employeeCode).trim(), "Personal"],
      ["firstName", () => str(body.firstName).trim(), "Personal"],
      ["middleName", () => strOrNull(body.middleName), "Personal"],
      ["lastName", () => strOrNull(body.lastName), "Personal"],
      ["displayName", () => strOrNull(body.displayName), "Personal"],
      ["gender", () => strOrNull(body.gender), "Personal"],
      ["dateOfBirth", () => toDate(body.dateOfBirth), "Personal"],
      ["maritalStatus", () => strOrNull(body.maritalStatus), "Personal"],
      ["bloodGroup", () => strOrNull(body.bloodGroup), "Personal"],
      ["nationality", () => str(body.nationality, "Indian"), "Personal"],
      ["dateOfJoining", () => toDate(body.dateOfJoining), "Job"],
      ["employmentType", () => str(body.employmentType, "Full-time"), "Job"],
      ["employeeStatus", () => str(body.employeeStatus, "Active"), "Job"],
      ["departmentId", () => strOrNull(body.departmentId), "Job"],
      ["designationId", () => strOrNull(body.designationId), "Job"],
      ["branchId", () => strOrNull(body.branchId), "Job"],
      ["entityId", () => strOrNull(body.entityId), "Job"],
      ["gradeId", () => strOrNull(body.gradeId), "Job"],
      ["locationId", () => strOrNull(body.locationId), "Job"],
      ["reportingManagerId", () => strOrNull(body.reportingManagerId), "Job"],
      ["ctc", () => toFloat(body.ctc), "Compensation"],
      ["basicSalary", () => toFloat(body.basicSalary), "Compensation"],
      ["hra", () => toFloat(body.hra), "Compensation"],
    ]

    for (const [field, getValue, module] of fieldMap) {
      if (field in body) setField(field, getValue(), { module })
    }

    const extras: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (!EMPLOYEE_FIELDS.has(k)) extras[k] = v
    }
    if (Object.keys(extras).length) {
      data.customData = JSON.stringify(extras)
    }

    if (Object.keys(data).length === 0) return existing

    const updated = await employeeRepository.update(id, data)

    if (changed.length) {
      await db.employeeAuditLog.createMany({
        data: changed.map((c) => ({
          tenantId,
          employeeId: id,
          module: c.module || "Personal",
          field: c.field,
          oldValue: c.oldVal,
          newValue: c.newVal,
          action: "Update",
          changedBy: actorName || "HR Admin",
        })),
      })
    }

    const oldStatus = existing.employeeStatus
    const newStatus = data.employeeStatus as string | undefined
    if (newStatus && newStatus !== oldStatus) {
      await db.employeeStatusHistory.create({
        data: {
          tenantId, employeeId: id, oldStatus, newStatus,
          effectiveDate: new Date(),
          changedBy: actorName || "HR Admin",
        },
      })
      await db.employeeTimelineEvent.create({
        data: {
          tenantId, employeeId: id,
          eventType: "Status changed",
          title: `Status changed from "${oldStatus}" to "${newStatus}"`,
          eventDate: new Date(), actorName: actorName || "HR Admin",
        },
      })
    }

    await auditRepository.log({
      tenantId,
      module: "employees",
      action: "Update",
      recordId: id,
      userName: actorName,
      details: JSON.stringify(changed.map((c) => c.field)),
    })

    return updated
  },

  async delete(id: string, tenantId: string, actorName?: string) {
    const existing = await db.employee.findFirst({ where: { id, tenantId } })
    if (!existing) throw new ServiceError("Employee not found", 404)

    await employeeRepository.delete(id)

    await auditRepository.log({
      tenantId,
      module: "employees",
      action: "Delete",
      recordId: id,
      userName: actorName,
      details: JSON.stringify({ employeeCode: existing.employeeCode }),
    })

    return { ok: true }
  },
}

export class ServiceError extends Error {
  status: number
  constructor(message: string, status: number = 400) {
    super(message)
    this.status = status
  }
}
