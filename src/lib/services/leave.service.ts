import { leaveRepository } from "@/lib/repositories/leave.repository"
import { toDate, toBool, toNum, toStr, inclusiveDays, eachDay, isoDate, csvToList, listToCsv } from "@/lib/validation"
import { db } from "@/lib/db"
import {
  writeLedger,
  adjustBalance,
  writeAudit,
  resolveApprover,
} from "@/lib/leave-helpers"
import { ServiceError } from "@/lib/services/employee.service"

export interface LeaveApplicationParams {
  tenantId: string
  employeeId: string
  leaveTypeId: string
  fromDate: string
  toDate: string
  halfDay?: boolean
  halfDayType?: string
  hours?: number | null
  reason?: string
  attachmentUrl?: string
  attachmentName?: string
  emergencyContact?: string
  backupPersonId?: string
  handoverNotes?: string
  notifyTeamMemberIds?: string
  addressDuringLeave?: string
  contactDuringLeave?: string
  extraFieldsJson?: string
  leavePolicyItemId?: string
}

export const leaveService = {
  async list(params: {
    tenantId: string
    employeeId?: string
    status?: string
    leaveTypeId?: string
    fromDate?: string
    toDate?: string
    managerId?: string
    departmentId?: string
    page: number
    pageSize: number
  }) {
    const { items, total } = await leaveRepository.findMany({
      tenantId: params.tenantId,
      employeeId: params.employeeId,
      status: params.status,
      leaveTypeId: params.leaveTypeId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      managerId: params.managerId,
      departmentId: params.departmentId,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    })
    return { items, total, page: params.page, pageSize: params.pageSize }
  },

  async apply(params: LeaveApplicationParams) {
    const { tenantId, employeeId, leaveTypeId } = params

    const fromRaw = params.fromDate
    const toRaw = params.toDate
    if (!fromRaw || !toRaw) throw new ServiceError("fromDate and toDate are required", 400)

    const fromDate = toDate(fromRaw)
    const toDateVal = toDate(toRaw)
    if (!fromDate || !toDateVal) throw new ServiceError("Invalid fromDate / toDate", 400)
    if (toDateVal < fromDate) throw new ServiceError("toDate cannot be before fromDate", 400)

    const [employee, leaveType] = await Promise.all([
      db.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true, firstName: true, lastName: true, displayName: true, reportingManagerId: true, departmentId: true },
      }),
      db.leaveType.findFirst({ where: { id: leaveTypeId, tenantId } }),
    ])
    if (!employee) throw new ServiceError("Employee not found", 404)
    if (!leaveType) throw new ServiceError("Leave type not found", 404)

    const halfDay = toBool(params.halfDay, false)
    const halfDayType = halfDay ? toStr(params.halfDayType, "FirstHalf") : null
    const hours = toNum(params.hours)
    const leaveUnit = leaveType.leaveUnit

    let days: number
    if (hours && (leaveUnit === "Hourly" || leaveUnit === "Mixed")) {
      days = Math.round((hours / 8) * 100) / 100
      if (halfDay) days = Math.min(days, 0.5)
    } else if (halfDay) {
      days = 0.5
    } else {
      days = inclusiveDays(fromDate, toDateVal)
    }

    if (days <= 0) throw new ServiceError("days must be greater than zero", 400)

    const holidays = await db.holiday.findMany({
      where: { tenantId, date: { gte: fromDate, lte: toDateVal } },
      select: { date: true, name: true },
    })
    const holidaySet = new Set(holidays.map((h) => isoDate(h.date)))
    const weeklyOffs = await db.weeklyOffCalendar.findMany({
      where: { tenantId, status: "Active" },
      select: { fixedDays: true },
    })
    const weeklyOffSet = new Set<number>()
    for (const w of weeklyOffs) {
      const wDays = csvToList(w.fixedDays) || []
      for (const d of wDays) {
        const n = Number(d)
        if (Number.isFinite(n)) weeklyOffSet.add(n)
      }
    }

    const workflow = await leaveRepository.findActiveWorkflow(tenantId)

    const result = await db.$transaction(async (tx) => {
      const application = await tx.leaveApplication.create({
        data: {
          tenantId, employeeId, leaveTypeId,
          leavePolicyItemId: params.leavePolicyItemId || undefined,
          fromDate, toDate: toDateVal, days, halfDay, halfDayType,
          hours: hours || null,
          reason: params.reason || "",
          attachmentUrl: params.attachmentUrl || "",
          attachmentName: params.attachmentName || "",
          emergencyContact: params.emergencyContact || "",
          backupPersonId: params.backupPersonId || "",
          handoverNotes: params.handoverNotes || "",
          notifyTeamMemberIds: listToCsv(csvToList(params.notifyTeamMemberIds)),
          addressDuringLeave: params.addressDuringLeave || "",
          contactDuringLeave: params.contactDuringLeave || "",
          extraFieldsJson: params.extraFieldsJson || "",
          status: workflow ? "Pending" : "AutoApproved",
        },
      })

      const daysIn = eachDay(fromDate, toDateVal)
      for (const d of daysIn) {
        const isHol = holidaySet.has(isoDate(d))
        const isWO = weeklyOffSet.has(d.getDay())
        let dayType = "FullDay"
        if (halfDay) dayType = halfDayType || "FirstHalf"
        await tx.leaveApplicationDay.create({
          data: {
            applicationId: application.id,
            date: d, dayType,
            hours: hours || null,
            isHoliday: isHol, isWeeklyOff: isWO,
            counted: !(isHol || isWO) || leaveType.sandwichRule,
          },
        })
      }

      if (!workflow) {
        await tx.leaveApplication.update({
          where: { id: application.id },
          data: {
            status: "AutoApproved",
            decisionAt: new Date(),
            decisionBy: "system",
            decisionComment: "Auto-approved (no leave workflow configured)",
          },
        })
        await writeLedger(tx, {
          tenantId, employeeId, leaveTypeId,
          transactionType: "LeaveApproved",
          debit: days,
          referenceType: "LeaveApplication",
          referenceId: application.id,
          applicationId: application.id,
          remarks: `Auto-approved leave (${days} day(s))`,
          createdBy: "system",
        })
        await adjustBalance(tx, {
          tenantId, employeeId, leaveTypeId,
          year: fromDate.getFullYear(), field: "used", delta: days,
        })
        await writeAudit(tx, {
          tenantId, employeeId,
          action: "LeaveApproved",
          referenceType: "LeaveApplication",
          referenceId: application.id,
          newValue: JSON.stringify({ status: "AutoApproved", days }),
          performedBy: "system",
        })
        return tx.leaveApplication.findUnique({
          where: { id: application.id },
          include: {
            employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, department: { select: { id: true, name: true } }, designation: { select: { id: true, name: true } }, reportingManagerId: true } },
            leaveType: true,
            approvals: { orderBy: { stepOrder: "asc" } },
            days_log: { orderBy: { date: "asc" } },
            ledgerEntries: { orderBy: { createdAt: "desc" } },
          },
        })
      }

      const instance = await tx.workflowInstance.create({
        data: {
          tenantId, workflowId: workflow.id, module: "leave",
          recordId: application.id, initiatorId: employeeId,
          status: "Pending", currentLevel: 1,
        },
      })

      const steps = workflow.steps
      let firstApproverId: string | null = null
      let firstApproverName: string | null = null
      for (const step of steps) {
        const resolved = step.approverType === "SpecificEmployee"
          ? { approverId: step.approverId, approverName: null }
          : await resolveApprover(tx, {
              tenantId,
              step: { approverType: step.approverType, approverId: step.approverId, approverRole: step.approverRole },
              employeeId,
            })
        await tx.leaveApproval.create({
          data: {
            applicationId: application.id,
            stepOrder: step.level,
            approverType: step.approverType,
            approverId: resolved.approverId,
            approverName: resolved.approverName,
            action: "Pending",
          },
        })
        if (step.level === 1) {
          firstApproverId = resolved.approverId
          firstApproverName = resolved.approverName
        }
      }

      await tx.leaveApplication.update({
        where: { id: application.id },
        data: { workflowInstanceId: instance.id, currentApproverId: firstApproverId },
      })

      await writeLedger(tx, {
        tenantId, employeeId, leaveTypeId,
        transactionType: "LeaveApplied",
        debit: days,
        referenceType: "LeaveApplication",
        referenceId: application.id,
        applicationId: application.id,
        remarks: `Leave applied (${days} day(s))`,
        createdBy: employeeId,
      })
      await adjustBalance(tx, {
        tenantId, employeeId, leaveTypeId,
        year: fromDate.getFullYear(), field: "pending", delta: days,
      })
      await writeAudit(tx, {
        tenantId, employeeId,
        action: "LeaveApplied",
        referenceType: "LeaveApplication",
        referenceId: application.id,
        newValue: JSON.stringify({ days, leaveTypeId, fromDate, toDate: toDateVal, status: "Pending" }),
        performedBy: employeeId,
      })

      return tx.leaveApplication.findUnique({
        where: { id: application.id },
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, department: { select: { id: true, name: true } }, designation: { select: { id: true, name: true } }, reportingManagerId: true } },
          leaveType: true,
          approvals: { orderBy: { stepOrder: "asc" } },
          days_log: { orderBy: { date: "asc" } },
          ledgerEntries: { orderBy: { createdAt: "desc" } },
        },
      })
    })

    return result
  },
}
