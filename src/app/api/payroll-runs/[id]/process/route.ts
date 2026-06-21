import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad } from "@/lib/api-helpers"

type Ctx = { params: Promise<{ id: string }> }

// POST /api/payroll-runs/[id]/process
// Generates payslips for all active employees who have an active salary assignment
export async function POST(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params

  const run = await db.payrollRun.findFirst({ where: { id, tenantId } })
  if (!run) return bad("Payroll run not found", 404)
  if (run.status !== "Draft" && run.status !== "Processing") {
    return bad(`Cannot process a payroll run in ${run.status} status`)
  }

  // Mark as Processing
  await db.payrollRun.update({ where: { id }, data: { status: "Processing" } })

  // Delete existing payslips for this run (re-processing)
  await db.payslip.deleteMany({ where: { payrollRunId: id } })

  // Get all active salary assignments
  const assignments = await db.salaryAssignment.findMany({
    where: { tenantId, isActive: true },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, employeeStatus: true } },
    },
  })

  // Filter to active employees
  const activeAssignments = assignments.filter((a) => a.employee.employeeStatus === "Active")

  let totalGross = 0
  let totalNet = 0
  let totalDeductions = 0
  let totalEmployer = 0
  let count = 0

  for (const a of activeAssignments) {
    // Check for existing payslip (shouldn't exist since we deleted, but be safe)
    // Determine LOP days — for now, 0 (could integrate with attendance later)
    const lopDays = 0
    const workingDays = 30
    const daysPaid = workingDays - lopDays
    const lopFactor = daysPaid / workingDays

    const basic = Math.round(a.basic * lopFactor)
    const hra = Math.round(a.hra * lopFactor)
    const specialAllowance = Math.round(a.specialAllowance * lopFactor)
    const conveyanceAllowance = a.conveyanceAllowance // fixed
    const medicalAllowance = a.medicalAllowance // fixed
    const bonusAmount = a.bonusAmount
    const grossEarnings = basic + hra + specialAllowance + conveyanceAllowance + medicalAllowance + bonusAmount

    const pfEmployee = Math.round(a.pfEmployee * lopFactor)
    const esiEmployee = Math.round(a.esiEmployee * lopFactor)
    const professionalTax = a.professionalTax
    const tdsAmount = Math.round(a.tdsAmount * lopFactor)
    const totalDed = pfEmployee + esiEmployee + professionalTax + tdsAmount

    const netSalary = grossEarnings - totalDed

    const pfEmployer = Math.round(a.pfEmployer * lopFactor)
    const esiEmployer = Math.round(a.esiEmployer * lopFactor)
    const totalEmployerContribution = pfEmployer + esiEmployer

    await db.payslip.create({
      data: {
        tenantId,
        employeeId: a.employeeId,
        payrollRunId: id,
        payPeriod: run.payPeriod,
        payPeriodStart: run.payPeriodStart,
        payPeriodEnd: run.payPeriodEnd,
        payDate: run.payDate,
        basic, hra, specialAllowance, conveyanceAllowance, medicalAllowance, bonusAmount,
        grossEarnings,
        pfEmployee, esiEmployee, professionalTax, tdsAmount, totalDeductions: totalDed,
        netSalary,
        pfEmployer, esiEmployer, totalEmployerContribution,
        ctc: a.ctc,
        workingDays, daysPaid, lopDays,
        status: "Generated",
      },
    })

    totalGross += grossEarnings
    totalNet += netSalary
    totalDeductions += totalDed
    totalEmployer += totalEmployerContribution
    count++
  }

  // Update run with totals + mark Completed
  const updated = await db.payrollRun.update({
    where: { id },
    data: {
      status: "Completed",
      processedAt: new Date(),
      totalGross,
      totalNet,
      totalDeductions,
      totalEmployerContribution: totalEmployer,
      employeeCount: count,
    },
  })

  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ action: "processed", payslips: count, totalNet }) },
  })

  return ok({ run: updated, payslipsGenerated: count, totalGross, totalNet, totalDeductions })
}
