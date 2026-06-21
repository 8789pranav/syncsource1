import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

// Compute salary components from CTC + structure
function computeSalary(ctc: number, s: any) {
  const basic = Math.round((ctc * s.basicPercent) / 100 / 12)
  const hra = Math.round((ctc * s.hraPercent) / 100 / 12)
  const conveyance = s.conveyanceAllowance
  const medical = s.medicalAllowance
  const bonus = s.bonusAmount || 0
  const grossMonthly = basic + hra + conveyance + medical + bonus
  // special = gross - basic - hra - conveyance - medical - bonus (filler to reach target)
  // For annual: special = ctc - basic*12 - hra*12 - conveyance*12 - medical*12 - bonus*12 - pfEmployer*12 - esiEmployer*12
  const pfEmployer = Math.round((basic * s.pfEmployerPercent) / 100)
  const esiEmployer = s.esiEmployerPercent > 0 && ctc <= 210000 ? Math.round((grossMonthly * s.esiEmployerPercent) / 100) : 0
  const specialAnnual = Math.max(0, ctc - (basic + hra + conveyance + medical + bonus) * 12 - pfEmployer * 12 - esiEmployer * 12)
  const specialAllowance = Math.round(specialAnnual / 12)
  const pfEmployee = Math.round((basic * s.pfEmployeePercent) / 100)
  const esiEmployee = s.esiEmployeePercent > 0 && ctc <= 210000 ? Math.round((grossMonthly * s.esiEmployeePercent) / 100) : 0
  const professionalTax = s.professionalTax
  const tdsAmount = Math.round((ctc * s.tdsPercent) / 100 / 12)
  const grossSalary = basic + hra + specialAllowance + conveyance + medical + bonus
  const totalDeductions = pfEmployee + esiEmployee + professionalTax + tdsAmount
  const netSalary = grossSalary - totalDeductions
  const totalEmployerContribution = pfEmployer + esiEmployer
  return {
    basic, hra, specialAllowance, conveyanceAllowance: conveyance, medicalAllowance: medical,
    bonusAmount: bonus, pfEmployee, pfEmployer, esiEmployee, esiEmployer,
    professionalTax, tdsAmount, grossSalary, netSalary, totalEmployerContribution,
  }
}

// GET /api/salary-assignments?employeeId=&active=1
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const url = new URL(req.url)
  const employeeId = url.searchParams.get("employeeId") || undefined
  const activeOnly = url.searchParams.get("active") === "1"
  const where: any = { tenantId }
  if (employeeId) where.employeeId = employeeId
  if (activeOnly) where.isActive = true
  const items = await db.salaryAssignment.findMany({
    where,
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, departmentId: true, department: { select: { name: true } }, designation: { select: { name: true } } } },
      salaryStructure: { select: { id: true, code: true, name: true } },
    },
    orderBy: { effectiveDate: "desc" },
  })
  return ok({ items })
}

// POST /api/salary-assignments — assign a salary structure to an employee
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const employeeId = String(body.employeeId || "")
  const salaryStructureId = String(body.salaryStructureId || "")
  const ctc = Number(body.ctc)
  const effectiveDate = toDate(body.effectiveDate) || new Date()

  if (!employeeId) return bad("Employee is required")
  if (!salaryStructureId) return bad("Salary structure is required")
  if (!ctc || ctc <= 0) return bad("CTC must be a positive number")

  const emp = await db.employee.findFirst({ where: { id: employeeId, tenantId } })
  if (!emp) return bad("Employee not found", 404)

  const structure = await db.salaryStructure.findFirst({ where: { id: salaryStructureId, tenantId } })
  if (!structure) return bad("Salary structure not found", 404)

  // Close previous active assignment
  await db.salaryAssignment.updateMany({
    where: { employeeId, isActive: true },
    data: { isActive: false, endDate: effectiveDate },
  })

  const comp = computeSalary(ctc, structure)
  const rec = await db.salaryAssignment.create({
    data: {
      tenantId,
      employeeId,
      salaryStructureId,
      ctc,
      ...comp,
      effectiveDate,
      isActive: true,
    },
  })

  // Also update the Employee's compensation fields
  await db.employee.update({
    where: { id: employeeId },
    data: {
      ctc,
      basicSalary: comp.basic,
      hra: comp.hra,
      specialAllowance: comp.specialAllowance,
      conveyanceAllowance: comp.conveyanceAllowance,
      medicalAllowance: comp.medicalAllowance,
      bonusAmount: comp.bonusAmount,
      pfEmployee: comp.pfEmployee,
      pfEmployer: comp.pfEmployer,
      esiAmount: comp.esiEmployee + comp.esiEmployer,
      professionalTax: comp.professionalTax,
      tdsAmount: comp.tdsAmount,
      grossSalary: comp.grossSalary,
      netSalary: comp.netSalary,
    },
  })

  // Compensation history entry
  await db.employeeCompensationHistory.create({
    data: {
      tenantId,
      employeeId,
      effectiveDate,
      oldCtc: emp.ctc,
      newCtc: ctc,
      oldBasic: emp.basicSalary,
      newBasic: comp.basic,
      oldHra: emp.hra,
      newHra: comp.hra,
      incrementPercent: emp.ctc ? Math.round(((ctc - emp.ctc) / emp.ctc) * 100) : null,
      revisionReason: "Salary structure assigned",
      approvedBy: "HR Admin",
      status: "Approved",
    },
  })

  // Timeline event
  await db.employeeTimelineEvent.create({
    data: {
      tenantId,
      employeeId,
      eventType: "Salary revised",
      title: "Salary structure assigned",
      description: `CTC set to ₹${ctc.toLocaleString("en-IN")} (${structure.name})`,
      eventDate: new Date(),
      actorName: "HR Admin",
    },
  })

  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Create", recordId: rec.id, userName: "HR Admin", details: JSON.stringify({ employeeId, ctc, structure: structure.code }) },
  })
  return created(rec)
}
