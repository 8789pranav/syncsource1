"use client"

// ============================================================================
//  Payroll — seed data (in-memory)
// ----------------------------------------------------------------------------
//  Comprehensive seed data for all 5 payroll menus:
//  Salary, Compliance, Arrear, Full & Final, Settings.
//  Mimics what the Prisma database would return.
// ============================================================================

import {
  PayGroup, SalaryComponent, SalaryStructure, EmployeeSalary, SalaryRevision,
  PayrollRun, Payslip, PayrollInput, BankPayment,
  ComplianceRule, PFRecord, ESIRecord, PTRecord, LWFRecord, TDSRecord,
  InvestmentDeclaration, Form16, Challan,
  ArrearCase, FnFCase, EntityPayrollConfig,
} from "./shared"

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000).toISOString()
const monthStr = (offset = 0) => {
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
}

// ---------- Pay Groups ----------
export const PAY_GROUPS: PayGroup[] = [
  { id: "pg-1", name: "India Monthly Payroll", code: "IND_MON", description: "Standard monthly payroll for India full-time employees", entity: "ACME India Pvt Ltd", frequency: "Monthly", payrollMonth: "1st to 31st", payDate: "Last Working Day", currency: "INR", status: "Active", employeeCount: 142, isDefault: true, createdAt: daysAgo(365) },
  { id: "pg-2", name: "India Contract Payroll", code: "IND_CON", description: "Monthly payroll for India contract employees", entity: "ACME India Pvt Ltd", frequency: "Monthly", payrollMonth: "1st to 31st", payDate: "7th of next month", currency: "INR", status: "Active", employeeCount: 18, isDefault: false, createdAt: daysAgo(280) },
  { id: "pg-3", name: "UAE Monthly Payroll", code: "UAE_MON", description: "Monthly payroll for UAE employees with WPS support", entity: "ACME UAE LLC", frequency: "Monthly", payrollMonth: "1st to 31st", payDate: "28th", currency: "AED", status: "Active", employeeCount: 24, isDefault: true, createdAt: daysAgo(300) },
  { id: "pg-4", name: "US Bi-Weekly Payroll", code: "US_BIW", description: "Bi-weekly payroll for US employees", entity: "ACME US Inc", frequency: "Bi-Weekly", payrollMonth: "1st to 15th", payDate: "Alternate Friday", currency: "USD", status: "Active", employeeCount: 36, isDefault: true, createdAt: daysAgo(220) },
  { id: "pg-5", name: "Singapore Monthly Payroll", code: "SG_MON", description: "Monthly payroll for Singapore employees", entity: "ACME Singapore Pte Ltd", frequency: "Monthly", payrollMonth: "1st to 31st", payDate: "25th", currency: "SGD", status: "Active", employeeCount: 12, isDefault: true, createdAt: daysAgo(180) },
  { id: "pg-6", name: "India Daily Wage", code: "IND_DW", description: "Daily wage payroll for India daily-wage workers", entity: "ACME India Pvt Ltd", frequency: "Daily Wage", payrollMonth: "Daily", payDate: "Weekly", currency: "INR", status: "Active", employeeCount: 8, isDefault: false, createdAt: daysAgo(150) },
]

// ---------- Salary Components ----------
export const SALARY_COMPONENTS: SalaryComponent[] = [
  { id: "sc-1", name: "Basic", code: "BASIC", type: "Earning", calcType: "Percentage", percentageOf: "CTC", value: 40, taxable: true, statutory: false, isActive: true, payslipDisplay: true, description: "Base salary — 40% of CTC", priority: 1 },
  { id: "sc-2", name: "House Rent Allowance", code: "HRA", type: "Earning", calcType: "Percentage", percentageOf: "Basic", value: 50, taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "HRA — 50% of Basic (metro)", priority: 2 },
  { id: "sc-3", name: "Special Allowance", code: "SA", type: "Earning", calcType: "Formula", formula: "CTC - Basic - HRA - PF - Gratuity - Bonus", taxable: true, statutory: false, isActive: true, payslipDisplay: true, description: "Balance adjustment component", priority: 3 },
  { id: "sc-4", name: "Conveyance Allowance", code: "CONV", type: "Earning", calcType: "Fixed", value: 1600, taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Fixed ₹1,600/month conveyance", priority: 4 },
  { id: "sc-5", name: "Medical Allowance", code: "MED", type: "Earning", calcType: "Fixed", value: 1250, taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Fixed ₹1,250/month medical", priority: 5 },
  { id: "sc-6", name: "Lunch Allowance", code: "LUNCH", type: "Earning", calcType: "Fixed", value: 2200, taxable: true, statutory: false, isActive: true, payslipDisplay: true, description: "Monthly lunch allowance", priority: 6 },
  { id: "sc-7", name: "Performance Bonus", code: "BONUS", type: "Earning", calcType: "Manual", taxable: true, statutory: false, isActive: true, payslipDisplay: true, description: "Variable performance bonus", priority: 7 },
  { id: "sc-8", name: "Leave Travel Allowance", code: "LTA", type: "Earning", calcType: "Manual", taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Annual LTA — tax-free on submission", priority: 8 },
  { id: "sc-9", name: "Provident Fund (Employee)", code: "PF_EMP", type: "Deduction", calcType: "Percentage", percentageOf: "Basic", value: 12, taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "Employee PF contribution — 12% of Basic", priority: 1 },
  { id: "sc-10", name: "Provident Fund (Employer)", code: "PF_EMR", type: "Employer Contribution", calcType: "Percentage", percentageOf: "Basic", value: 12, taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "Employer PF contribution — 12% of Basic", priority: 2 },
  { id: "sc-11", name: "Professional Tax", code: "PT", type: "Statutory", calcType: "Slab", taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "State-wise PT slab (₹200/₹300)", priority: 3 },
  { id: "sc-12", name: "TDS", code: "TDS", type: "Statutory", calcType: "Slab", taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "Income tax TDS as per regime", priority: 4 },
  { id: "sc-13", name: "ESI (Employee)", code: "ESI_EMP", type: "Deduction", calcType: "Percentage", percentageOf: "Gross", value: 0.75, taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "Employee ESI — 0.75% of gross (wage ceiling ₹21,000)", priority: 5 },
  { id: "sc-14", name: "ESI (Employer)", code: "ESI_EMR", type: "Employer Contribution", calcType: "Percentage", percentageOf: "Gross", value: 3.25, taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "Employer ESI — 3.25% of gross", priority: 6 },
  { id: "sc-15", name: "Gratuity", code: "GRAT", type: "Employer Contribution", calcType: "Percentage", percentageOf: "Basic", value: 4.81, taxable: false, statutory: true, isActive: true, payslipDisplay: true, description: "Gratuity provision — 4.81% of Basic", priority: 7 },
  { id: "sc-16", name: "Loan Recovery", code: "LOAN", type: "Deduction", calcType: "Manual", taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Loan EMI recovery", priority: 8 },
  { id: "sc-17", name: "Salary Advance Recovery", code: "ADV", type: "Deduction", calcType: "Manual", taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Salary advance EMI recovery", priority: 9 },
  { id: "sc-18", name: "Fuel Reimbursement", code: "FUEL", type: "Reimbursement", calcType: "Manual", taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Monthly fuel reimbursement", priority: 1 },
  { id: "sc-19", name: "Internet Reimbursement", code: "NET", type: "Reimbursement", calcType: "Fixed", value: 1000, taxable: false, statutory: false, isActive: true, payslipDisplay: true, description: "Work-from-home internet reimbursement", priority: 2 },
  { id: "sc-20", name: "CTC", code: "CTC", type: "Informational", calcType: "Formula", formula: "Basic + HRA + Special + Conveyance + Medical + Bonus + Employer PF + Employer ESI + Gratuity", taxable: false, statutory: false, isActive: true, payslipDisplay: false, description: "Cost to Company — annual", priority: 0 },
]

// ---------- Salary Structures ----------
export const SALARY_STRUCTURES: SalaryStructure[] = [
  {
    id: "ss-1", name: "India Full-Time Structure", code: "IND_FT",
    description: "Standard CTC structure for India full-time employees with PF, Gratuity, and all statutory components",
    entity: "ACME India Pvt Ltd", employeeType: "Full-Time", grade: "All",
    components: [
      { componentCode: "BASIC", componentName: "Basic", calcType: "Percentage", percentageOf: "CTC", value: 40, isMandatory: true },
      { componentCode: "HRA", componentName: "House Rent Allowance", calcType: "Percentage", percentageOf: "Basic", value: 50, isMandatory: true },
      { componentCode: "SA", componentName: "Special Allowance", calcType: "Formula", isMandatory: true },
      { componentCode: "CONV", componentName: "Conveyance", calcType: "Fixed", value: 1600, isMandatory: false },
      { componentCode: "MED", componentName: "Medical", calcType: "Fixed", value: 1250, isMandatory: false },
      { componentCode: "PF_EMP", componentName: "PF (Employee)", calcType: "Percentage", percentageOf: "Basic", value: 12, isMandatory: true },
      { componentCode: "PF_EMR", componentName: "PF (Employer)", calcType: "Percentage", percentageOf: "Basic", value: 12, isMandatory: true },
      { componentCode: "GRAT", componentName: "Gratuity", calcType: "Percentage", percentageOf: "Basic", value: 4.81, isMandatory: true },
      { componentCode: "PT", componentName: "Professional Tax", calcType: "Slab", isMandatory: true },
      { componentCode: "TDS", componentName: "TDS", calcType: "Slab", isMandatory: true },
    ],
    ctcFormula: "Basic + HRA + Special + Conveyance + Medical + Employer PF + Gratuity",
    monthlyCtcMin: 25000, monthlyCtcMax: 500000,
    isDefault: true, status: "Active", version: 3,
    effectiveFrom: daysAgo(365), createdAt: daysAgo(365), updatedAt: daysAgo(15),
  },
  {
    id: "ss-2", name: "India Contract Structure", code: "IND_CON_S",
    description: "CTC structure for India contract employees — no PF, no Gratuity",
    entity: "ACME India Pvt Ltd", employeeType: "Contract",
    components: [
      { componentCode: "BASIC", componentName: "Basic", calcType: "Percentage", percentageOf: "CTC", value: 60, isMandatory: true },
      { componentCode: "SA", componentName: "Special Allowance", calcType: "Formula", isMandatory: true },
      { componentCode: "TDS", componentName: "TDS", calcType: "Slab", isMandatory: true },
    ],
    ctcFormula: "Basic + Special Allowance",
    monthlyCtcMin: 15000, monthlyCtcMax: 150000,
    isDefault: true, status: "Active", version: 1,
    effectiveFrom: daysAgo(280), createdAt: daysAgo(280), updatedAt: daysAgo(60),
  },
  {
    id: "ss-3", name: "UAE Salary Structure", code: "UAE_S",
    description: "UAE salary structure with Basic, Housing, Transport — WPS compliant",
    entity: "ACME UAE LLC", employeeType: "Full-Time", grade: "All",
    components: [
      { componentCode: "BASIC", componentName: "Basic", calcType: "Percentage", percentageOf: "CTC", value: 60, isMandatory: true },
      { componentCode: "HRA", componentName: "Housing Allowance", calcType: "Percentage", percentageOf: "CTC", value: 25, isMandatory: true },
      { componentCode: "CONV", componentName: "Transport Allowance", calcType: "Percentage", percentageOf: "CTC", value: 10, isMandatory: true },
      { componentCode: "SA", componentName: "Special Allowance", calcType: "Formula", isMandatory: true },
    ],
    ctcFormula: "Basic + Housing + Transport + Special",
    monthlyCtcMin: 5000, monthlyCtcMax: 100000,
    isDefault: true, status: "Active", version: 2,
    effectiveFrom: daysAgo(300), createdAt: daysAgo(300), updatedAt: daysAgo(30),
  },
  {
    id: "ss-4", name: "US Salary Structure", code: "US_S",
    description: "US salary structure with federal & state tax withholding",
    entity: "ACME US Inc", employeeType: "Full-Time",
    components: [
      { componentCode: "BASIC", componentName: "Base Salary", calcType: "Percentage", percentageOf: "CTC", value: 75, isMandatory: true },
      { componentCode: "SA", componentName: "Bonus", calcType: "Manual", isMandatory: false },
      { componentCode: "TDS", componentName: "Federal Tax", calcType: "Slab", isMandatory: true },
    ],
    ctcFormula: "Base Salary + Bonus",
    monthlyCtcMin: 4000, monthlyCtcMax: 40000,
    isDefault: true, status: "Active", version: 1,
    effectiveFrom: daysAgo(220), createdAt: daysAgo(220), updatedAt: daysAgo(45),
  },
  {
    id: "ss-5", name: "India Intern Structure", code: "IND_INT",
    description: "Stipend structure for India interns — no statutory components",
    entity: "ACME India Pvt Ltd", employeeType: "Intern",
    components: [
      { componentCode: "BASIC", componentName: "Stipend", calcType: "Fixed", value: 25000, isMandatory: true },
    ],
    ctcFormula: "Stipend",
    monthlyCtcMin: 10000, monthlyCtcMax: 50000,
    isDefault: true, status: "Active", version: 1,
    effectiveFrom: daysAgo(120), createdAt: daysAgo(120), updatedAt: daysAgo(20),
  },
]

// ---------- Employees (synthetic) ----------
const EMP_SEED = [
  { id: "EMP-1001", name: "Arjun Sharma", dept: "Engineering", desg: "Senior Software Engineer", grade: "G5", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 1800000 },
  { id: "EMP-1002", name: "Priya Patel", dept: "Product", desg: "Product Manager", grade: "G6", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 2200000 },
  { id: "EMP-1003", name: "Rohit Gupta", dept: "Engineering", desg: "Tech Lead", grade: "G6", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 2800000 },
  { id: "EMP-1004", name: "Sneha Reddy", dept: "Design", desg: "Senior UX Designer", grade: "G5", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 1900000 },
  { id: "EMP-1005", name: "Vikram Singh", dept: "Sales", desg: "Sales Manager", grade: "M1", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 2400000 },
  { id: "EMP-1006", name: "Anita Desai", dept: "Human Resources", desg: "HR Business Partner", grade: "G5", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 1700000 },
  { id: "EMP-1007", name: "Karthik Iyer", dept: "Finance", desg: "Finance Analyst", grade: "G4", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 1200000 },
  { id: "EMP-1008", name: "Deepa Nair", dept: "Marketing", desg: "Marketing Lead", grade: "M1", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 2100000 },
  { id: "EMP-1009", name: "Rajesh Kumar", dept: "Operations", desg: "Operations Manager", grade: "M2", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 2600000 },
  { id: "EMP-1010", name: "Meera Joshi", dept: "Customer Success", desg: "CS Manager", grade: "M1", type: "Full-Time", entity: "ACME India Pvt Ltd", ctc: 2000000 },
  { id: "EMP-1011", name: "Sai Krishnan", dept: "Engineering", desg: "Software Engineer", grade: "G3", type: "Contract", entity: "ACME India Pvt Ltd", ctc: 900000 },
  { id: "EMP-1012", name: "Fatima Khan", dept: "Engineering", desg: "Intern", grade: "G1", type: "Intern", entity: "ACME India Pvt Ltd", ctc: 300000 },
  { id: "EMP-2001", name: "Ahmed Al-Rashid", dept: "Sales", desg: "Regional Sales Head", grade: "M3", type: "Full-Time", entity: "ACME UAE LLC", ctc: 480000 },
  { id: "EMP-2002", name: "Layla Hassan", dept: "Marketing", desg: "Marketing Manager", grade: "M2", type: "Full-Time", entity: "ACME UAE LLC", ctc: 360000 },
  { id: "EMP-2003", name: "Omar Khalid", dept: "Operations", desg: "Operations Lead", grade: "M1", type: "Full-Time", entity: "ACME UAE LLC", ctc: 300000 },
  { id: "EMP-3001", name: "John Smith", dept: "Engineering", desg: "Staff Engineer", grade: "E1", type: "Full-Time", entity: "ACME US Inc", ctc: 240000 },
  { id: "EMP-3002", name: "Emily Johnson", dept: "Product", desg: "Senior PM", grade: "M2", type: "Full-Time", entity: "ACME US Inc", ctc: 200000 },
  { id: "EMP-4001", name: "Wei Tan", dept: "Engineering", desg: "Senior Engineer", grade: "G6", type: "Full-Time", entity: "ACME Singapore Pte Ltd", ctc: 144000 },
]

// ---------- Employee Salary ----------
export const EMPLOYEE_SALARIES: EmployeeSalary[] = EMP_SEED.map((e, i) => {
  const monthlyCtc = Math.round(e.ctc / 12)
  const basic = Math.round(monthlyCtc * 0.4)
  const hra = Math.round(basic * 0.5)
  const special = monthlyCtc - basic - hra - 1600 - 1250 - Math.round(basic * 0.12) - Math.round(basic * 0.0481)
  const pfEmp = Math.round(basic * 0.12)
  const pt = 200
  const totalEarnings = basic + hra + special + 1600 + 1250
  const totalDeductions = pfEmp + pt
  const payGroup = e.entity.includes("UAE") ? "pg-3" : e.entity.includes("US") ? "pg-4" : e.entity.includes("Singapore") ? "pg-5" : e.type === "Contract" ? "pg-2" : e.type === "Intern" ? "pg-1" : "pg-1"
  const structure = e.entity.includes("UAE") ? "ss-3" : e.entity.includes("US") ? "ss-4" : e.type === "Contract" ? "ss-2" : e.type === "Intern" ? "ss-5" : "ss-1"
  return {
    id: `es-${i + 1}`,
    employeeId: e.id, employeeName: e.name, employeeCode: e.id,
    entity: e.entity, department: e.dept, designation: e.desg, grade: e.grade, employeeType: e.type,
    payGroupId: payGroup,
    payGroupName: PAY_GROUPS.find(p => p.id === payGroup)?.name || "",
    salaryStructureId: structure,
    salaryStructureName: SALARY_STRUCTURES.find(s => s.id === structure)?.name || "",
    ctcAnnual: e.ctc, ctcMonthly: monthlyCtc,
    basicMonthly: basic, hraMonthly: hra, specialAllowanceMonthly: special,
    totalEarningsMonthly: totalEarnings, totalDeductionsMonthly: totalDeductions,
    netPayMonthly: totalEarnings - totalDeductions,
    effectiveFrom: daysAgo(180 - i * 5),
    status: i % 11 === 0 ? "On Hold" : "Active",
    lastRevisionDate: daysAgo(60 - i * 2),
  }
})

// ---------- Salary Revisions ----------
export const SALARY_REVISIONS: SalaryRevision[] = [
  { id: "sr-1", employeeId: "EMP-1001", employeeName: "Arjun Sharma", employeeCode: "EMP-1001", entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Senior Software Engineer", revisionType: "Annual Hike", previousCtc: 1600000, revisedCtc: 1800000, hikePercent: 12.5, previousBasic: 53333, revisedBasic: 60000, effectiveFrom: daysAhead(7), reason: "Annual performance review — Exceeds Expectations", status: "Approved", arrearGenerated: false, approvedBy: "Anita Desai", approvedAt: daysAgo(2), createdAt: daysAgo(14) },
  { id: "sr-2", employeeId: "EMP-1003", employeeName: "Rohit Gupta", employeeCode: "EMP-1003", entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Tech Lead", revisionType: "Promotion", previousCtc: 2400000, revisedCtc: 2800000, hikePercent: 16.67, previousBasic: 80000, revisedBasic: 93333, effectiveFrom: daysAhead(14), reason: "Promoted to Tech Lead from Senior Engineer", status: "Pending Approval", arrearGenerated: false, createdAt: daysAgo(5) },
  { id: "sr-3", employeeId: "EMP-1002", employeeName: "Priya Patel", employeeCode: "EMP-1002", entity: "ACME India Pvt Ltd", department: "Product", designation: "Product Manager", revisionType: "Annual Hike", previousCtc: 2000000, revisedCtc: 2200000, hikePercent: 10, previousBasic: 66667, revisedBasic: 73333, effectiveFrom: daysAhead(7), reason: "Annual performance review — Meets Expectations", status: "Approved", arrearGenerated: true, approvedBy: "Anita Desai", approvedAt: daysAgo(1), createdAt: daysAgo(14) },
  { id: "sr-4", employeeId: "EMP-1005", employeeName: "Vikram Singh", employeeCode: "EMP-1005", entity: "ACME India Pvt Ltd", department: "Sales", designation: "Sales Manager", revisionType: "Market Correction", previousCtc: 2100000, revisedCtc: 2400000, hikePercent: 14.29, previousBasic: 70000, revisedBasic: 80000, effectiveFrom: daysAgo(30), reason: "Market correction — below market benchmark", status: "Implemented", arrearGenerated: true, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(35), createdAt: daysAgo(45) },
  { id: "sr-5", employeeId: "EMP-1004", employeeName: "Sneha Reddy", employeeCode: "EMP-1004", entity: "ACME India Pvt Ltd", department: "Design", designation: "Senior UX Designer", revisionType: "Annual Hike", previousCtc: 1700000, revisedCtc: 1900000, hikePercent: 11.76, previousBasic: 56667, revisedBasic: 63333, effectiveFrom: daysAhead(21), reason: "Annual performance review — Exceeds Expectations", status: "Pending Approval", arrearGenerated: false, createdAt: daysAgo(3) },
  { id: "sr-6", employeeId: "EMP-1006", employeeName: "Anita Desai", employeeCode: "EMP-1006", entity: "ACME India Pvt Ltd", department: "Human Resources", designation: "HR Business Partner", revisionType: "Probation Confirmation", previousCtc: 1500000, revisedCtc: 1700000, hikePercent: 13.33, previousBasic: 50000, revisedBasic: 56667, effectiveFrom: daysAgo(15), reason: "Probation confirmation — 6 months review", status: "Implemented", arrearGenerated: true, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(20), createdAt: daysAgo(28) },
  { id: "sr-7", employeeId: "EMP-1008", employeeName: "Deepa Nair", employeeCode: "EMP-1008", entity: "ACME India Pvt Ltd", department: "Marketing", designation: "Marketing Lead", revisionType: "Correction", previousCtc: 2200000, revisedCtc: 2100000, hikePercent: -4.55, previousBasic: 73333, revisedBasic: 70000, effectiveFrom: daysAhead(30), reason: "Correction — CTC mis-allocated during onboarding", status: "Draft", arrearGenerated: false, createdAt: daysAgo(1) },
  { id: "sr-8", employeeId: "EMP-2001", employeeName: "Ahmed Al-Rashid", employeeCode: "EMP-2001", entity: "ACME UAE LLC", department: "Sales", designation: "Regional Sales Head", revisionType: "Annual Hike", previousCtc: 440000, revisedCtc: 480000, hikePercent: 9.09, previousBasic: 22000, revisedBasic: 24000, effectiveFrom: daysAhead(10), reason: "Annual performance review — Exceeds Expectations", status: "Approved", arrearGenerated: false, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(2), createdAt: daysAgo(10) },
]

// ---------- Payroll Runs ----------
function buildRunEmployees(filter: (e: typeof EMP_SEED[0]) => boolean) {
  return EMP_SEED.filter(filter).map((e, i) => {
    const monthlyCtc = Math.round(e.ctc / 12)
    const basic = Math.round(monthlyCtc * 0.4)
    const hra = Math.round(basic * 0.5)
    const special = monthlyCtc - basic - hra - 1600 - 1250 - Math.round(basic * 0.12) - Math.round(basic * 0.0481)
    const earnings = basic + hra + special + 1600 + 1250
    const pfEmp = Math.round(basic * 0.12)
    const pt = 200
    const tds = Math.round(earnings * 0.05)
    const deductions = pfEmp + pt + tds
    const lopDays = i % 4 === 0 ? 1 : 0
    return {
      employeeId: e.id, employeeName: e.name, employeeCode: e.id, department: e.dept,
      grossEarnings: earnings, totalDeductions: deductions,
      netPay: earnings - deductions, lopDays,
      presentDays: 30 - lopDays,
      status: i % 5 === 0 ? "Hold" : i % 3 === 0 ? "Released" : "Processed" as "Processed" | "Pending" | "Hold" | "Released",
    }
  })
}

export const PAYROLL_RUNS: PayrollRun[] = [
  {
    id: "pr-1", name: "India Monthly — " + monthStr(0), code: "RUN_IND_" + monthStr(0).replace(/\s/g, "_"),
    payGroupId: "pg-1", payGroupName: "India Monthly Payroll", entity: "ACME India Pvt Ltd",
    payrollMonth: monthStr(0), payDate: daysAhead(5),
    status: "Processed", totalEmployees: 142, processedEmployees: 142,
    grossPayout: 28500000, totalDeductions: 4200000, netPayout: 24300000,
    lopDays: 18, arrearAmount: 350000, bonusAmount: 500000, reimbursementAmount: 120000,
    startedAt: daysAgo(3), processedAt: daysAgo(1),
    employees: buildRunEmployees(e => e.entity.includes("India") && e.type === "Full-Time"),
    createdAt: daysAgo(4),
  },
  {
    id: "pr-2", name: "UAE Monthly — " + monthStr(0), code: "RUN_UAE_" + monthStr(0).replace(/\s/g, "_"),
    payGroupId: "pg-3", payGroupName: "UAE Monthly Payroll", entity: "ACME UAE LLC",
    payrollMonth: monthStr(0), payDate: daysAhead(2),
    status: "Approved", totalEmployees: 24, processedEmployees: 24,
    grossPayout: 9800000, totalDeductions: 980000, netPayout: 8820000,
    lopDays: 2, arrearAmount: 0, bonusAmount: 100000, reimbursementAmount: 30000,
    startedAt: daysAgo(5), processedAt: daysAgo(3), approvedAt: daysAgo(1), approvedBy: "Rajesh Kumar",
    employees: buildRunEmployees(e => e.entity.includes("UAE")),
    createdAt: daysAgo(6),
  },
  {
    id: "pr-3", name: "India Monthly — " + monthStr(1), code: "RUN_IND_" + monthStr(1).replace(/\s/g, "_"),
    payGroupId: "pg-1", payGroupName: "India Monthly Payroll", entity: "ACME India Pvt Ltd",
    payrollMonth: monthStr(1), payDate: daysAgo(25),
    status: "Paid", totalEmployees: 142, processedEmployees: 142,
    grossPayout: 28100000, totalDeductions: 4180000, netPayout: 23920000,
    lopDays: 14, arrearAmount: 280000, bonusAmount: 0, reimbursementAmount: 95000,
    startedAt: daysAgo(35), processedAt: daysAgo(33), approvedAt: daysAgo(30), approvedBy: "Rajesh Kumar",
    paidAt: daysAgo(25),
    employees: buildRunEmployees(e => e.entity.includes("India") && e.type === "Full-Time"),
    createdAt: daysAgo(36),
  },
  {
    id: "pr-4", name: "US Bi-Weekly — Current", code: "RUN_US_BIW_CUR",
    payGroupId: "pg-4", payGroupName: "US Bi-Weekly Payroll", entity: "ACME US Inc",
    payrollMonth: monthStr(0), payDate: daysAhead(3),
    status: "Processing", totalEmployees: 36, processedEmployees: 24,
    grossPayout: 5400000, totalDeductions: 1350000, netPayout: 4050000,
    lopDays: 1, arrearAmount: 0, bonusAmount: 0, reimbursementAmount: 20000,
    startedAt: daysAgo(2),
    employees: buildRunEmployees(e => e.entity.includes("US")),
    createdAt: daysAgo(3),
  },
  {
    id: "pr-5", name: "India Contract — " + monthStr(0), code: "RUN_IND_CON_" + monthStr(0).replace(/\s/g, "_"),
    payGroupId: "pg-2", payGroupName: "India Contract Payroll", entity: "ACME India Pvt Ltd",
    payrollMonth: monthStr(0), payDate: daysAhead(7),
    status: "Draft", totalEmployees: 18, processedEmployees: 0,
    grossPayout: 1620000, totalDeductions: 162000, netPayout: 1458000,
    lopDays: 0, arrearAmount: 0, bonusAmount: 0, reimbursementAmount: 0,
    employees: buildRunEmployees(e => e.entity.includes("India") && e.type === "Contract"),
    createdAt: daysAgo(1),
  },
  {
    id: "pr-6", name: "Singapore Monthly — " + monthStr(0), code: "RUN_SG_" + monthStr(0).replace(/\s/g, "_"),
    payGroupId: "pg-5", payGroupName: "Singapore Monthly Payroll", entity: "ACME Singapore Pte Ltd",
    payrollMonth: monthStr(0), payDate: daysAhead(4),
    status: "Processed", totalEmployees: 12, processedEmployees: 12,
    grossPayout: 1440000, totalDeductions: 144000, netPayout: 1296000,
    lopDays: 0, arrearAmount: 0, bonusAmount: 50000, reimbursementAmount: 10000,
    startedAt: daysAgo(3), processedAt: daysAgo(1),
    employees: buildRunEmployees(e => e.entity.includes("Singapore")),
    createdAt: daysAgo(4),
  },
]

// ---------- Payslips ----------
export const PAYSLIPS: Payslip[] = EMP_SEED.slice(0, 14).map((e, i) => {
  const monthlyCtc = Math.round(e.ctc / 12)
  const basic = Math.round(monthlyCtc * 0.4)
  const hra = Math.round(basic * 0.5)
  const special = monthlyCtc - basic - hra - 1600 - 1250 - Math.round(basic * 0.12) - Math.round(basic * 0.0481)
  const pfEmp = Math.round(basic * 0.12)
  const pt = 200
  const tds = Math.round((basic + hra + special) * 0.05)
  return {
    id: "ps-" + (i + 1),
    employeeId: e.id, employeeName: e.name, employeeCode: e.id,
    entity: e.entity, department: e.dept, designation: e.desg,
    payGroupId: "pg-1", payrollRunId: "pr-1", payrollRunName: PAYROLL_RUNS[0].name,
    payrollMonth: monthStr(0), payDate: daysAhead(5),
    pan: "ABCDE" + (1000 + i) + "F", bankAccount: "5010" + (1000 + i) + "2345", bankIfsc: "HDFC000" + (100 + i),
    payDays: 30, lopDays: i % 4 === 0 ? 1 : 0, presentDays: 30 - (i % 4 === 0 ? 1 : 0),
    earnings: [
      { name: "Basic", amount: basic, ytd: basic * (now.getMonth() + 1) },
      { name: "HRA", amount: hra, ytd: hra * (now.getMonth() + 1) },
      { name: "Special Allowance", amount: special, ytd: special * (now.getMonth() + 1) },
      { name: "Conveyance", amount: 1600, ytd: 1600 * (now.getMonth() + 1) },
      { name: "Medical", amount: 1250, ytd: 1250 * (now.getMonth() + 1) },
    ],
    deductions: [
      { name: "PF (Employee)", amount: pfEmp, ytd: pfEmp * (now.getMonth() + 1) },
      { name: "Professional Tax", amount: pt, ytd: pt * (now.getMonth() + 1) },
      { name: "TDS", amount: tds, ytd: tds * (now.getMonth() + 1) },
    ],
    grossEarnings: basic + hra + special + 1600 + 1250,
    totalDeductions: pfEmp + pt + tds,
    netPay: basic + hra + special + 1600 + 1250 - pfEmp - pt - tds,
    ctcAnnual: e.ctc,
    status: i < 8 ? "Published" : i < 11 ? "Generated" : i === 11 ? "Held" : "Generated",
    publishedAt: i < 8 ? daysAgo(1) : undefined,
    generatedAt: daysAgo(2),
  }
})

// ---------- Payroll Inputs ----------
export const PAYROLL_INPUTS: PayrollInput[] = [
  { id: "pi-1", employeeId: "EMP-1001", employeeName: "Arjun Sharma", employeeCode: "EMP-1001", entity: "ACME India Pvt Ltd", department: "Engineering", inputType: "Overtime", amount: 4500, description: "Overtime — 15 hours @ ₹300/hr", referenceId: "OT-001", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Approved", source: "Manual", approvedBy: "Rohit Gupta", createdAt: daysAgo(3) },
  { id: "pi-2", employeeId: "EMP-1002", employeeName: "Priya Patel", employeeCode: "EMP-1002", entity: "ACME India Pvt Ltd", department: "Product", inputType: "Bonus", amount: 50000, description: "Quarterly performance bonus — Q1", referenceId: "BNS-Q1-002", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Approved", source: "Manual", approvedBy: "Rajesh Kumar", createdAt: daysAgo(5) },
  { id: "pi-3", employeeId: "EMP-1003", employeeName: "Rohit Gupta", employeeCode: "EMP-1003", entity: "ACME India Pvt Ltd", department: "Engineering", inputType: "Incentive", amount: 35000, description: "Project completion incentive — Atlas migration", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Pending", source: "Manual", createdAt: daysAgo(2) },
  { id: "pi-4", employeeId: "EMP-1004", employeeName: "Sneha Reddy", employeeCode: "EMP-1004", entity: "ACME India Pvt Ltd", department: "Design", inputType: "Reimbursement", amount: 8500, description: "Fuel reimbursement — April", referenceId: "EXP-2025-045", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Approved", source: "Expense", approvedBy: "Anita Desai", createdAt: daysAgo(4) },
  { id: "pi-5", employeeId: "EMP-1005", employeeName: "Vikram Singh", employeeCode: "EMP-1005", entity: "ACME India Pvt Ltd", department: "Sales", inputType: "Incentive", amount: 85000, description: "Sales incentive — Q1 target achievement (115%)", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Approved", source: "Manual", approvedBy: "Rajesh Kumar", createdAt: daysAgo(7) },
  { id: "pi-6", employeeId: "EMP-1006", employeeName: "Anita Desai", employeeCode: "EMP-1006", entity: "ACME India Pvt Ltd", department: "Human Resources", inputType: "LOP Reversal", amount: 5600, description: "LOP reversal — approved leave retroactively", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Approved", source: "Leave", approvedBy: "Rajesh Kumar", createdAt: daysAgo(2) },
  { id: "pi-7", employeeId: "EMP-1007", employeeName: "Karthik Iyer", employeeCode: "EMP-1007", entity: "ACME India Pvt Ltd", department: "Finance", inputType: "Loan", amount: 10000, description: "Loan EMI — Personal loan LI-2024-018", referenceId: "LI-2024-018", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Locked", source: "Loan", createdAt: daysAgo(8) },
  { id: "pi-8", employeeId: "EMP-1008", employeeName: "Deepa Nair", employeeCode: "EMP-1008", entity: "ACME India Pvt Ltd", department: "Marketing", inputType: "Attendance", amount: -3200, description: "LOP — 1 day (unpaid leave on 12th)", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Approved", source: "Attendance", approvedBy: "System", createdAt: daysAgo(10) },
  { id: "pi-9", employeeId: "EMP-1009", employeeName: "Rajesh Kumar", employeeCode: "EMP-1009", entity: "ACME India Pvt Ltd", department: "Operations", inputType: "Reimbursement", amount: 15000, description: "Travel reimbursement — Mumbai site visit", referenceId: "EXP-2025-052", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Pending", source: "Expense", createdAt: daysAgo(1) },
  { id: "pi-10", employeeId: "EMP-1010", employeeName: "Meera Joshi", employeeCode: "EMP-1010", entity: "ACME India Pvt Ltd", department: "Customer Success", inputType: "Manual Adjustment", amount: 2500, description: "Adjustment — underpaid last month", payGroupId: "pg-1", payrollMonth: monthStr(0), status: "Pending", source: "Manual", createdAt: daysAgo(1) },
  { id: "pi-11", employeeId: "EMP-1011", employeeName: "Sai Krishnan", employeeCode: "EMP-1011", entity: "ACME India Pvt Ltd", department: "Engineering", inputType: "Attendance", amount: -4500, description: "LOP — 2 days (unpaid leave)", payGroupId: "pg-2", payrollMonth: monthStr(0), status: "Approved", source: "Attendance", approvedBy: "System", createdAt: daysAgo(5) },
  { id: "pi-12", employeeId: "EMP-2001", employeeName: "Ahmed Al-Rashid", employeeCode: "EMP-2001", entity: "ACME UAE LLC", department: "Sales", inputType: "Incentive", amount: 20000, description: "Quarterly sales incentive — AED", payGroupId: "pg-3", payrollMonth: monthStr(0), status: "Approved", source: "Manual", approvedBy: "Rajesh Kumar", createdAt: daysAgo(4) },
]

// ---------- Bank Payments ----------
export const BANK_PAYMENTS: BankPayment[] = [
  { id: "bp-1", payrollRunId: "pr-3", payrollRunName: PAYROLL_RUNS[2].name, entity: "ACME India Pvt Ltd", payGroupId: "pg-1", bankAccount: "5010012345678", bankName: "HDFC Bank", fileFormat: "HDFC Format", totalAmount: 23920000, employeeCount: 142, status: "Paid", generatedAt: daysAgo(28), sentAt: daysAgo(27), approvedAt: daysAgo(26), approvedBy: "Rajesh Kumar", paidAt: daysAgo(25), fileReference: "HDFC-BULK-20250526", utrNumber: "UTR" + (1000000 + 1), createdAt: daysAgo(29) },
  { id: "bp-2", payrollRunId: "pr-2", payrollRunName: PAYROLL_RUNS[1].name, entity: "ACME UAE LLC", payGroupId: "pg-3", bankAccount: "012345678901", bankName: "Emirates NBD", fileFormat: "UAE WPS / SIF", totalAmount: 8820000, employeeCount: 24, status: "Approved", generatedAt: daysAgo(3), sentAt: daysAgo(2), approvedAt: daysAgo(1), approvedBy: "Rajesh Kumar", fileReference: "WPS-SIF-20250601", createdAt: daysAgo(4) },
  { id: "bp-3", payrollRunId: "pr-1", payrollRunName: PAYROLL_RUNS[0].name, entity: "ACME India Pvt Ltd", payGroupId: "pg-1", bankAccount: "5010012345678", bankName: "HDFC Bank", fileFormat: "HDFC Format", totalAmount: 24300000, employeeCount: 142, status: "Pending", createdAt: daysAgo(1) },
  { id: "bp-4", payrollRunId: "pr-6", payrollRunName: PAYROLL_RUNS[5].name, entity: "ACME Singapore Pte Ltd", payGroupId: "pg-5", bankAccount: "00123456789", bankName: "DBS Bank", fileFormat: "Custom CSV", totalAmount: 1296000, employeeCount: 12, status: "File Generated", generatedAt: daysAgo(1), createdAt: daysAgo(2) },
  { id: "bp-5", payrollRunId: "pr-4", payrollRunName: PAYROLL_RUNS[3].name, entity: "ACME US Inc", payGroupId: "pg-4", bankAccount: "1234567890", bankName: "Chase Bank", fileFormat: "Custom CSV", totalAmount: 4050000, employeeCount: 36, status: "Pending", createdAt: daysAgo(1) },
]

// ---------- Compliance Rules ----------
export const COMPLIANCE_RULES: ComplianceRule[] = [
  { id: "cr-1", name: "India Standard Compliance", code: "IND_STD", entity: "ACME India Pvt Ltd", country: "India", pfApplicable: true, esiApplicable: true, ptApplicable: true, lwfApplicable: true, tdsApplicable: true, gratuityApplicable: true, bonusApplicable: true, pfRate: 12, pensionRate: 8.33, esiRate: 3.25, esiWageCeiling: 21000, ptAmount: 200, lwfRate: 0.2, status: "Active", isDefault: true },
  { id: "cr-2", name: "UAE WPS Compliance", code: "UAE_WPS", entity: "ACME UAE LLC", country: "United Arab Emirates", pfApplicable: false, esiApplicable: false, ptApplicable: false, lwfApplicable: false, tdsApplicable: false, gratuityApplicable: true, bonusApplicable: false, pfRate: 0, pensionRate: 0, esiRate: 0, esiWageCeiling: 0, ptAmount: 0, lwfRate: 0, status: "Active", isDefault: true },
  { id: "cr-3", name: "US Federal Compliance", code: "US_FED", entity: "ACME US Inc", country: "United States", pfApplicable: false, esiApplicable: false, ptApplicable: false, lwfApplicable: false, tdsApplicable: true, gratuityApplicable: false, bonusApplicable: false, pfRate: 0, pensionRate: 0, esiRate: 0, esiWageCeiling: 0, ptAmount: 0, lwfRate: 0, status: "Active", isDefault: true },
  { id: "cr-4", name: "Singapore CPF Compliance", code: "SG_CPF", entity: "ACME Singapore Pte Ltd", country: "Singapore", pfApplicable: false, esiApplicable: false, ptApplicable: false, lwfApplicable: false, tdsApplicable: false, gratuityApplicable: false, bonusApplicable: false, pfRate: 0, pensionRate: 0, esiRate: 0, esiWageCeiling: 0, ptAmount: 0, lwfRate: 0, status: "Active", isDefault: true },
]

// ---------- PF Records ----------
export const PF_RECORDS: PFRecord[] = EMP_SEED.slice(0, 10).map((e, i) => {
  const monthlyCtc = Math.round(e.ctc / 12)
  const basic = Math.round(monthlyCtc * 0.4)
  const pfEmp = Math.round(basic * 0.12)
  const pension = Math.round(basic * 0.0833)
  return {
    id: "pf-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
    entity: e.entity, uan: "1012345678" + (10 + i),
    employeeContribution: pfEmp, employerContribution: pfEmp, pensionContribution: pension,
    totalContribution: pfEmp * 2 + pension, payrollMonth: monthStr(0),
    wageCapped: basic > 15000, status: i < 6 ? "Filed" : "Pending",
  }
})

// ---------- ESI Records ----------
export const ESI_RECORDS: ESIRecord[] = EMP_SEED.slice(10, 14).map((e, i) => {
  const monthlyCtc = Math.round(e.ctc / 12)
  const gross = Math.round(monthlyCtc * 0.95)
  const emp = Math.round(gross * 0.0075)
  const emr = Math.round(gross * 0.0325)
  return {
    id: "esi-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
    entity: e.entity, esicNumber: "ESIC" + (2000000 + i),
    employeeContribution: emp, employerContribution: emr, totalContribution: emp + emr,
    payrollMonth: monthStr(0), withinWageCeiling: gross <= 21000,
    status: i < 2 ? "Filed" : "Pending",
  }
})

// ---------- PT Records ----------
export const PT_RECORDS: PTRecord[] = EMP_SEED.slice(0, 12).map((e, i) => ({
  id: "pt-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
  entity: e.entity, state: "Karnataka",
  amount: i % 2 === 0 ? 200 : 300, payrollMonth: monthStr(0),
  slab: i % 2 === 0 ? "₹5,001–₹8,000" : "₹8,001+",
  status: i < 8 ? "Filed" : "Pending",
}))

// ---------- LWF Records ----------
export const LWF_RECORDS: LWFRecord[] = EMP_SEED.slice(0, 10).map((e, i) => ({
  id: "lwf-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
  entity: e.entity, state: "Karnataka",
  employeeContribution: 20, employerContribution: 40,
  payrollMonth: monthStr(0),
  status: i < 6 ? "Filed" : "Pending",
}))

// ---------- TDS Records ----------
export const TDS_RECORDS: TDSRecord[] = EMP_SEED.slice(0, 12).map((e, i) => {
  const annualCtc = e.ctc
  const grossIncome = annualCtc
  const totalDeductions = 150000 + 50000 + 20000
  const taxableIncome = Math.max(0, grossIncome - totalDeductions)
  const taxLiability = Math.round(taxableIncome * 0.15 * 0.8)
  const tdsMonthly = Math.round(taxLiability / 12)
  return {
    id: "tds-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
    entity: e.entity, pan: "ABCDE" + (1000 + i) + "F",
    regime: i % 2 === 0 ? "New" : "Old",
    grossIncome, totalDeductions, taxableIncome, taxLiability,
    tdsDeducted: tdsMonthly, payrollMonth: monthStr(0),
    ytdTds: tdsMonthly * (now.getMonth() + 1),
    status: i < 8 ? "Filed" : "Pending",
  }
})

// ---------- Investment Declarations ----------
export const INVESTMENT_DECLARATIONS: InvestmentDeclaration[] = EMP_SEED.slice(0, 10).map((e, i) => ({
  id: "id-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
  entity: e.entity, financialYear: "2025-26",
  regime: i % 2 === 0 ? "Old" : "New",
  section80C: i % 3 === 0 ? 150000 : i % 3 === 1 ? 100000 : 80000,
  section80D: i % 2 === 0 ? 25000 : 50000,
  section80CCD: i % 4 === 0 ? 50000 : 0,
  section24: i % 2 === 0 ? 200000 : 0,
  section80E: i % 5 === 0 ? 30000 : 0,
  section80G: i % 3 === 0 ? 10000 : 0,
  otherDeductions: i % 4 === 0 ? 15000 : 0,
  totalDeclared: i % 3 === 0 ? 480000 : i % 3 === 1 ? 375000 : 230000,
  totalProofSubmitted: i < 4 ? (i % 3 === 0 ? 480000 : i % 3 === 1 ? 375000 : 230000) : i < 7 ? 100000 : 0,
  status: i < 4 ? "Approved" : i < 7 ? "Verified" : i < 9 ? "Submitted" : "Draft",
  submittedAt: daysAgo(30 - i * 3),
  verifiedBy: i < 7 ? "Karthik Iyer" : undefined,
}))

// ---------- Form 16 ----------
export const FORM_16: Form16[] = EMP_SEED.slice(0, 10).map((e, i) => ({
  id: "f16-" + (i + 1), employeeId: e.id, employeeName: e.name, employeeCode: e.id,
  entity: e.entity, pan: "ABCDE" + (1000 + i) + "F", financialYear: "2024-25",
  grossSalary: e.ctc, totalTds: Math.round(e.ctc * 0.08),
  partA: true, partB: i < 8,
  status: i < 5 ? "Issued" : i < 8 ? "Generated" : "Pending",
  generatedAt: daysAgo(30 - i * 2),
  issuedAt: i < 5 ? daysAgo(20 - i * 2) : undefined,
}))

// ---------- Challans ----------
export const CHALLANS: Challan[] = [
  { id: "ch-1", challanType: "PF", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(0), dueDate: daysAhead(8), amount: 3120000, employeeCount: 142, status: "Pending" },
  { id: "ch-2", challanType: "ESI", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(0), dueDate: daysAhead(12), amount: 145000, employeeCount: 4, status: "Pending" },
  { id: "ch-3", challanType: "PT", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(0), dueDate: daysAhead(15), amount: 28400, employeeCount: 142, status: "Pending" },
  { id: "ch-4", challanType: "LWF", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(0), dueDate: daysAhead(15), amount: 6000, employeeCount: 142, status: "Pending" },
  { id: "ch-5", challanType: "TDS", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(0), dueDate: daysAhead(7), amount: 1850000, employeeCount: 142, status: "Pending" },
  { id: "ch-6", challanType: "PF", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(1), dueDate: daysAgo(22), amount: 3080000, employeeCount: 142, status: "Paid", challanNumber: "PF-2025-05-001", paidAt: daysAgo(20), referenceNumber: "UTR123456789" },
  { id: "ch-7", challanType: "ESI", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(1), dueDate: daysAgo(18), amount: 142000, employeeCount: 4, status: "Paid", challanNumber: "ESI-2025-05-001", paidAt: daysAgo(15), referenceNumber: "UTR123456790" },
  { id: "ch-8", challanType: "TDS", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(1), dueDate: daysAgo(25), amount: 1820000, employeeCount: 142, status: "Paid", challanNumber: "TDS-2025-05-001", paidAt: daysAgo(22), referenceNumber: "UTR123456791" },
  { id: "ch-9", challanType: "PT", entity: "ACME India Pvt Ltd", payrollMonth: monthStr(2), dueDate: daysAgo(55), amount: 28000, employeeCount: 142, status: "Overdue", challanNumber: undefined },
]

// ---------- Arrears ----------
export const ARREAR_CASES: ArrearCase[] = [
  { id: "ar-1", employeeId: "EMP-1004", employeeName: "Sneha Reddy", employeeCode: "EMP-1004", entity: "ACME India Pvt Ltd", department: "Design", arrearType: "Salary Revision", effectiveFrom: daysAgo(45), effectiveTo: daysAgo(15), monthsAffected: 2, arrearAmount: 38000, recoveryAmount: 0, netArrear: 38000, description: "Arrear from salary revision — annual hike 11.76% effective from 1st of last month", referenceId: "sr-5", status: "Pending Approval", payoutMonth: monthStr(0), showSeparately: true, createdAt: daysAgo(2) },
  { id: "ar-2", employeeId: "EMP-1005", employeeName: "Vikram Singh", employeeCode: "EMP-1005", entity: "ACME India Pvt Ltd", department: "Sales", arrearType: "Salary Revision", effectiveFrom: daysAgo(35), effectiveTo: daysAgo(5), monthsAffected: 1, arrearAmount: 25000, recoveryAmount: 0, netArrear: 25000, description: "Market correction arrear — revised CTC effective from last month", referenceId: "sr-4", status: "Approved", payoutMonth: monthStr(0), showSeparately: true, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(1), createdAt: daysAgo(5) },
  { id: "ar-3", employeeId: "EMP-1006", employeeName: "Anita Desai", employeeCode: "EMP-1006", entity: "ACME India Pvt Ltd", department: "Human Resources", arrearType: "Salary Revision", effectiveFrom: daysAgo(20), effectiveTo: daysAgo(0), monthsAffected: 1, arrearAmount: 16667, recoveryAmount: 0, netArrear: 16667, description: "Probation confirmation arrear", referenceId: "sr-6", status: "Paid", payoutMonth: monthStr(1), showSeparately: true, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(15), paidAt: daysAgo(25), createdAt: daysAgo(20) },
  { id: "ar-4", employeeId: "EMP-1007", employeeName: "Karthik Iyer", employeeCode: "EMP-1007", entity: "ACME India Pvt Ltd", department: "Finance", arrearType: "LOP Reversal", effectiveFrom: daysAgo(40), effectiveTo: daysAgo(40), monthsAffected: 1, arrearAmount: 4000, recoveryAmount: 0, netArrear: 4000, description: "LOP reversal — approved leave retroactively applied to last month", status: "Approved", payoutMonth: monthStr(0), showSeparately: false, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(1), createdAt: daysAgo(3) },
  { id: "ar-5", employeeId: "EMP-1001", employeeName: "Arjun Sharma", employeeCode: "EMP-1001", entity: "ACME India Pvt Ltd", department: "Engineering", arrearType: "Attendance Correction", effectiveFrom: daysAgo(25), effectiveTo: daysAgo(25), monthsAffected: 1, arrearAmount: 6000, recoveryAmount: 0, netArrear: 6000, description: "Attendance correction — swipe-in missing for 2 days, manually approved", status: "Pending Approval", payoutMonth: monthStr(0), showSeparately: false, createdAt: daysAgo(1) },
  { id: "ar-6", employeeId: "EMP-1003", employeeName: "Rohit Gupta", employeeCode: "EMP-1003", entity: "ACME India Pvt Ltd", department: "Engineering", arrearType: "Bonus", effectiveFrom: daysAgo(10), effectiveTo: daysAgo(10), monthsAffected: 1, arrearAmount: 75000, recoveryAmount: 0, netArrear: 75000, description: "Spot bonus — critical incident resolution (P0 outage)", status: "Approved", payoutMonth: monthStr(0), showSeparately: true, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(1), createdAt: daysAgo(4) },
  { id: "ar-7", employeeId: "EMP-1008", employeeName: "Deepa Nair", employeeCode: "EMP-1008", entity: "ACME India Pvt Ltd", department: "Marketing", arrearType: "Manual", effectiveFrom: daysAgo(15), effectiveTo: daysAgo(15), monthsAffected: 1, arrearAmount: 12000, recoveryAmount: 0, netArrear: 12000, description: "Manual arrear — joining bonus payout (deferred from onboarding)", status: "Pending Approval", payoutMonth: monthStr(0), showSeparately: true, createdAt: daysAgo(2) },
  { id: "ar-8", employeeId: "EMP-1002", employeeName: "Priya Patel", employeeCode: "EMP-1002", entity: "ACME India Pvt Ltd", department: "Product", arrearType: "Salary Revision", effectiveFrom: daysAgo(10), effectiveTo: daysAgo(0), monthsAffected: 1, arrearAmount: 16667, recoveryAmount: 0, netArrear: 16667, description: "Annual hike arrear — 10% hike effective from 1st of this month", referenceId: "sr-3", status: "Approved", payoutMonth: monthStr(0), showSeparately: true, approvedBy: "Anita Desai", approvedAt: daysAgo(1), createdAt: daysAgo(3) },
  { id: "ar-9", employeeId: "EMP-1011", employeeName: "Sai Krishnan", employeeCode: "EMP-1011", entity: "ACME India Pvt Ltd", department: "Engineering", arrearType: "Manual", effectiveFrom: daysAgo(30), effectiveTo: daysAgo(30), monthsAffected: 1, arrearAmount: 0, recoveryAmount: 9000, netArrear: -9000, description: "Salary overpaid last month — recovery arrear (negative)", status: "Approved", payoutMonth: monthStr(0), showSeparately: false, approvedBy: "Anita Desai", approvedAt: daysAgo(2), createdAt: daysAgo(4) },
  { id: "ar-10", employeeId: "EMP-1009", employeeName: "Rajesh Kumar", employeeCode: "EMP-1009", entity: "ACME India Pvt Ltd", department: "Operations", arrearType: "Incentive", effectiveFrom: daysAgo(20), effectiveTo: daysAgo(20), monthsAffected: 1, arrearAmount: 45000, recoveryAmount: 0, netArrear: 45000, description: "Operational excellence incentive — Q1", status: "Paid", payoutMonth: monthStr(1), showSeparately: true, approvedBy: "Rajesh Kumar", approvedAt: daysAgo(15), paidAt: daysAgo(25), createdAt: daysAgo(18) },
]

// ---------- Full & Final Cases ----------
export const FNF_CASES: FnFCase[] = [
  {
    id: "fnf-1", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190",
    entity: "ACME India Pvt Ltd", department: "Customer Success", designation: "CS Executive",
    exitCaseId: "EXIT-2025-007", exitType: "Voluntary Resignation",
    lwd: daysAhead(51), doj: daysAgo(720), tenureYears: 2,
    status: "Calculation In Progress",
    earnings: [
      { name: "Pending Salary", code: "SAL", amount: 48000, source: "Auto", category: "Earning" },
      { name: "Leave Encashment", code: "LEAVE", amount: 32000, source: "Auto", category: "Earning" },
      { name: "Bonus Pro-rata", code: "BONUS", amount: 12000, source: "Auto", category: "Earning" },
      { name: "Gratuity", code: "GRAT", amount: 38400, source: "Auto", category: "Earning" },
      { name: "Reimbursement", code: "REIMB", amount: 8500, source: "Manual", category: "Earning" },
    ],
    deductions: [
      { name: "Notice Recovery", code: "NOTICE", amount: 48000, source: "Auto", category: "Deduction" },
      { name: "Loan Recovery", code: "LOAN", amount: 25000, source: "Auto", category: "Deduction" },
      { name: "Asset Recovery", code: "ASSET", amount: 8500, source: "Auto", category: "Deduction" },
      { name: "TDS", code: "TDS", amount: 12400, source: "Auto", category: "Deduction" },
    ],
    totalEarnings: 138900, totalDeductions: 93900, netPayable: 45000,
    calculatedAt: daysAgo(1), createdAt: daysAgo(5),
  },
  {
    id: "fnf-2", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185",
    entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Software Engineer",
    exitCaseId: "EXIT-2025-005", exitType: "Voluntary Resignation",
    lwd: daysAgo(10), doj: daysAgo(1080), tenureYears: 3,
    status: "Paid",
    earnings: [
      { name: "Pending Salary", code: "SAL", amount: 75000, source: "Auto", category: "Earning" },
      { name: "Leave Encashment", code: "LEAVE", amount: 45000, source: "Auto", category: "Earning" },
      { name: "Gratuity", code: "GRAT", amount: 90000, source: "Auto", category: "Earning" },
      { name: "Bonus Pro-rata", code: "BONUS", amount: 20000, source: "Auto", category: "Earning" },
    ],
    deductions: [
      { name: "TDS", code: "TDS", amount: 28000, source: "Auto", category: "Deduction" },
      { name: "Asset Recovery", code: "ASSET", amount: 5000, source: "Auto", category: "Deduction" },
    ],
    totalEarnings: 230000, totalDeductions: 33000, netPayable: 197000,
    calculatedAt: daysAgo(25), approvedBy: "Rajesh Kumar", approvedAt: daysAgo(20),
    paidAt: daysAgo(12), paymentMode: "Bank Transfer", utrNumber: "UTR7654321",
    createdAt: daysAgo(30),
  },
  {
    id: "fnf-3", employeeId: "EMP-1180", employeeName: "Suresh Babu", employeeCode: "EMP-1180",
    entity: "ACME India Pvt Ltd", department: "Operations", designation: "Operations Analyst",
    exitCaseId: "EXIT-2025-003", exitType: "Involuntary Termination",
    lwd: daysAgo(45), doj: daysAgo(540), tenureYears: 1.5,
    status: "Approved",
    earnings: [
      { name: "Pending Salary", code: "SAL", amount: 55000, source: "Auto", category: "Earning" },
      { name: "Leave Encashment", code: "LEAVE", amount: 22000, source: "Auto", category: "Earning" },
      { name: "Gratuity", code: "GRAT", amount: 33000, source: "Auto", category: "Earning" },
    ],
    deductions: [
      { name: "TDS", code: "TDS", amount: 11000, source: "Auto", category: "Deduction" },
    ],
    totalEarnings: 110000, totalDeductions: 11000, netPayable: 99000,
    calculatedAt: daysAgo(50), approvedBy: "Rajesh Kumar", approvedAt: daysAgo(48),
    createdAt: daysAgo(55),
  },
  {
    id: "fnf-4", employeeId: "EMP-1175", employeeName: "Kavya Menon", employeeCode: "EMP-1175",
    entity: "ACME India Pvt Ltd", department: "Marketing", designation: "Marketing Analyst",
    exitCaseId: "EXIT-2025-001", exitType: "Voluntary Resignation",
    lwd: daysAhead(15), doj: daysAgo(360), tenureYears: 1,
    status: "Inputs Pending",
    earnings: [], deductions: [],
    totalEarnings: 0, totalDeductions: 0, netPayable: 0,
    createdAt: daysAgo(2),
  },
  {
    id: "fnf-5", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170",
    entity: "ACME India Pvt Ltd", department: "Sales", designation: "Sales Executive",
    exitCaseId: "EXIT-2024-045", exitType: "Voluntary Resignation",
    lwd: daysAgo(90), doj: daysAgo(1440), tenureYears: 4,
    status: "Paid",
    earnings: [
      { name: "Pending Salary", code: "SAL", amount: 65000, source: "Auto", category: "Earning" },
      { name: "Leave Encashment", code: "LEAVE", amount: 38000, source: "Auto", category: "Earning" },
      { name: "Gratuity", code: "GRAT", amount: 104000, source: "Auto", category: "Earning" },
      { name: "Incentive Pro-rata", code: "INCENT", amount: 35000, source: "Auto", category: "Earning" },
    ],
    deductions: [
      { name: "Notice Recovery", code: "NOTICE", amount: 65000, source: "Auto", category: "Deduction" },
      { name: "TDS", code: "TDS", amount: 22000, source: "Auto", category: "Deduction" },
      { name: "Loan Recovery", code: "LOAN", amount: 18000, source: "Auto", category: "Deduction" },
    ],
    totalEarnings: 242000, totalDeductions: 105000, netPayable: 137000,
    calculatedAt: daysAgo(100), approvedBy: "Rajesh Kumar", approvedAt: daysAgo(95),
    paidAt: daysAgo(88), paymentMode: "Bank Transfer", utrNumber: "UTR9876543",
    createdAt: daysAgo(110),
  },
  {
    id: "fnf-6", employeeId: "EMP-2005", employeeName: "Mohammed Ali", employeeCode: "EMP-2005",
    entity: "ACME UAE LLC", department: "Sales", designation: "Sales Executive",
    exitCaseId: "EXIT-2025-UAE-01", exitType: "End of Contract",
    lwd: daysAhead(30), doj: daysAgo(720), tenureYears: 2,
    status: "Pending Approval",
    earnings: [
      { name: "Pending Salary", code: "SAL", amount: 25000, source: "Auto", category: "Earning" },
      { name: "Leave Encashment", code: "LEAVE", amount: 15000, source: "Auto", category: "Earning" },
      { name: "Gratuity (UAE)", code: "GRAT", amount: 48000, source: "Auto", category: "Earning" },
    ],
    deductions: [],
    totalEarnings: 88000, totalDeductions: 0, netPayable: 88000,
    calculatedAt: daysAgo(3), createdAt: daysAgo(7),
  },
]

// ---------- Entity Payroll Configurations (Settings → Entity Configuration) ----------
export const ENTITY_PAYROLL_CONFIGS: EntityPayrollConfig[] = [
  {
    id: "epc-1", entity: "ACME India Pvt Ltd", country: "India", state: "Karnataka", currency: "INR",
    useTenantDefault: false, overrideTenantDefault: true, status: "Active", priority: 1, version: 3,
    effectiveFrom: daysAgo(365), effectiveTo: undefined,
    // Step 2
    payrollFrequency: "Monthly", payrollMonthStartDay: 1, payrollMonthEndDay: 31,
    payDate: "Last Working Day", attendanceCutOff: "25th", leaveCutOff: "25th",
    reimbursementCutOff: "20th", taxDeclarationCutOff: "15th", loanDeductionCutOff: "Last Day",
    arrearCutOff: "Last Day", payrollLockDate: "Last Day", payslipPublishDate: "Pay Date",
    // Step 3
    defaultPayGroup: "India Monthly Payroll", defaultSalaryStructure: "India Full-Time Structure",
    defaultComponentSet: "India Payroll Components", defaultEmployeeSalaryRule: "Auto-assign on join",
    defaultSalaryRevisionRule: "Annual + Promotion", defaultPayrollInputRule: "Manual + Auto",
    defaultLopRule: "Per day = CTC/30", defaultOvertimeRule: "Hourly @ 1.5x",
    defaultBonusRule: "Quarterly", defaultReimbursementRule: "Monthly cap",
    // Step 4
    complianceRule: "India Standard Compliance", pfApplicable: true, esiApplicable: true,
    ptApplicable: true, lwfApplicable: true, tdsApplicable: true, gratuityApplicable: true,
    bonusApplicable: true, minimumWageRule: "Karnataka State", taxRegimeRule: "New default, Old optional",
    investmentDeclarationRule: "Annual + Proof", form16Template: "India Form 16 (Auto)",
    challanRule: "Monthly auto-generate",
    // Step 5
    defaultPayslipTemplate: "India Payslip Template", showEmployerContribution: true,
    showCtcComponents: true, showYtd: true, showLopDays: true, showLeaveBalance: true,
    hideZeroComponents: true, defaultBankAccount: "HDFC Salary Account - 5010012345678",
    bankFileFormat: "HDFC Format", paymentApprovalRequired: true, paymentMode: "NEFT",
    // Step 6
    defaultArrearRule: "Auto on revision", autoArrearOnRevision: true, autoArrearOnLopReversal: true,
    autoArrearOnAttendance: true, arrearApprovalRequired: true, showArrearSeparately: true,
    allowManualArrear: true, allowNegativeArrear: true, defaultArrearPayoutMonth: "Next Cycle",
    defaultFnfRule: "Standard FnF", autoFetchPayrollInputs: true, autoFetchLeaveEncashment: true,
    autoFetchNoticeRecovery: true, autoFetchLoanRecovery: true, autoFetchAssetRecovery: true,
    autoFetchArrear: true, fnfApprovalRequired: true, allowFnfAfterExit: false,
    generateFnfLetter: true, fnfPaymentTracking: true,
    // Step 7
    payrollApprovalWorkflow: "Payroll Admin → Finance Manager → HR Head",
    salaryStructureApprovalWorkflow: "Payroll Admin → HR Head",
    salaryRevisionApprovalWorkflow: "Manager → HR Head → Finance",
    arrearApprovalWorkflow: "Manager → Finance Head",
    fnfApprovalWorkflow: "HR Head → Finance Head",
    bankPaymentApprovalWorkflow: "Finance Manager → CFO",
    emailTemplateGroup: "India Payroll Emails",
    payrollFinalizedEmail: true, payslipPublishedEmail: true, salaryHoldEmail: true,
    salaryReleaseEmail: true, taxDeclarationReminder: true, investmentProofReminder: true,
    arrearApprovedEmail: true, fnfPaymentEmail: true, bankPaymentNotification: true,
    // Step 8
    fetchAttendanceAuto: true, fetchLeaveAuto: true, fetchOvertimeAuto: false,
    fetchReimbursementAuto: true, fetchLoanDeductionAuto: true, fetchAssetRecoveryAuto: true,
    fetchOffboardingFnfAuto: true, fetchSalaryRevisionAuto: true, fetchArrearAuto: true,
    // Meta
    missingConfig: [], conflictWarnings: [],
    impactedEmployees: 142, createdBy: "Anita Desai", createdAt: daysAgo(365), updatedAt: daysAgo(15),
  },
  {
    id: "epc-2", entity: "ACME UAE LLC", country: "United Arab Emirates", state: "Dubai", currency: "AED",
    useTenantDefault: false, overrideTenantDefault: true, status: "Active", priority: 2, version: 1,
    effectiveFrom: daysAgo(300), effectiveTo: undefined,
    payrollFrequency: "Monthly", payrollMonthStartDay: 1, payrollMonthEndDay: 31,
    payDate: "28th", attendanceCutOff: "25th", leaveCutOff: "25th",
    reimbursementCutOff: "20th", taxDeclarationCutOff: "N/A", loanDeductionCutOff: "Last Day",
    arrearCutOff: "Last Day", payrollLockDate: "Last Day", payslipPublishDate: "Pay Date",
    defaultPayGroup: "UAE Monthly Payroll", defaultSalaryStructure: "UAE Salary Structure",
    defaultComponentSet: "UAE Payroll Components", defaultEmployeeSalaryRule: "Auto-assign on join",
    defaultSalaryRevisionRule: "Annual", defaultPayrollInputRule: "Manual + Auto",
    defaultLopRule: "Per day = CTC/30", defaultOvertimeRule: "Hourly @ 1.5x",
    defaultBonusRule: "Annual", defaultReimbursementRule: "Monthly cap",
    complianceRule: "UAE WPS Compliance", pfApplicable: false, esiApplicable: false,
    ptApplicable: false, lwfApplicable: false, tdsApplicable: false, gratuityApplicable: true,
    bonusApplicable: false, minimumWageRule: "UAE Labour Law", taxRegimeRule: "No income tax",
    investmentDeclarationRule: "N/A", form16Template: "N/A", challanRule: "WPS auto-file",
    defaultPayslipTemplate: "UAE Payslip Template", showEmployerContribution: false,
    showCtcComponents: true, showYtd: true, showLopDays: true, showLeaveBalance: false,
    hideZeroComponents: true, defaultBankAccount: "Emirates NBD Salary - 012345678901",
    bankFileFormat: "UAE WPS / SIF", paymentApprovalRequired: true, paymentMode: "WPS",
    defaultArrearRule: "Manual", autoArrearOnRevision: false, autoArrearOnLopReversal: true,
    autoArrearOnAttendance: true, arrearApprovalRequired: true, showArrearSeparately: true,
    allowManualArrear: true, allowNegativeArrear: false, defaultArrearPayoutMonth: "Next Cycle",
    defaultFnfRule: "UAE FnF (Gratuity)", autoFetchPayrollInputs: true, autoFetchLeaveEncashment: true,
    autoFetchNoticeRecovery: true, autoFetchLoanRecovery: true, autoFetchAssetRecovery: true,
    autoFetchArrear: true, fnfApprovalRequired: true, allowFnfAfterExit: false,
    generateFnfLetter: true, fnfPaymentTracking: true,
    payrollApprovalWorkflow: "Payroll Admin → Finance Head",
    salaryStructureApprovalWorkflow: "Payroll Admin → Finance Head",
    salaryRevisionApprovalWorkflow: "Manager → Finance Head",
    arrearApprovalWorkflow: "Manager → Finance Head",
    fnfApprovalWorkflow: "Finance Head",
    bankPaymentApprovalWorkflow: "Finance Manager → CFO",
    emailTemplateGroup: "UAE Payroll Emails",
    payrollFinalizedEmail: true, payslipPublishedEmail: true, salaryHoldEmail: true,
    salaryReleaseEmail: true, taxDeclarationReminder: false, investmentProofReminder: false,
    arrearApprovedEmail: true, fnfPaymentEmail: true, bankPaymentNotification: true,
    fetchAttendanceAuto: true, fetchLeaveAuto: true, fetchOvertimeAuto: true,
    fetchReimbursementAuto: true, fetchLoanDeductionAuto: true, fetchAssetRecoveryAuto: true,
    fetchOffboardingFnfAuto: true, fetchSalaryRevisionAuto: true, fetchArrearAuto: true,
    missingConfig: [], conflictWarnings: [],
    impactedEmployees: 24, createdBy: "Rajesh Kumar", createdAt: daysAgo(300), updatedAt: daysAgo(30),
  },
  {
    id: "epc-3", entity: "ACME US Inc", country: "United States", state: "California", currency: "USD",
    useTenantDefault: true, overrideTenantDefault: false, status: "Active", priority: 3, version: 1,
    effectiveFrom: daysAgo(220), effectiveTo: undefined,
    payrollFrequency: "Bi-Weekly", payrollMonthStartDay: 1, payrollMonthEndDay: 15,
    payDate: "Alternate Friday", attendanceCutOff: "Pay Period End", leaveCutOff: "Pay Period End",
    reimbursementCutOff: "Pay Period End", taxDeclarationCutOff: "Annual (W-4)", loanDeductionCutOff: "Pay Period End",
    arrearCutOff: "Pay Period End", payrollLockDate: "Pay Date - 2 days", payslipPublishDate: "Pay Date",
    defaultPayGroup: "US Bi-Weekly Payroll", defaultSalaryStructure: "US Salary Structure",
    defaultComponentSet: "US Payroll Components", defaultEmployeeSalaryRule: "Auto-assign on join",
    defaultSalaryRevisionRule: "Annual", defaultPayrollInputRule: "Manual",
    defaultLopRule: "Per day = CTC/260", defaultOvertimeRule: "Hourly @ 1.5x (non-exempt)",
    defaultBonusRule: "Annual", defaultReimbursementRule: "Monthly cap",
    complianceRule: "US Federal Compliance", pfApplicable: false, esiApplicable: false,
    ptApplicable: false, lwfApplicable: false, tdsApplicable: true, gratuityApplicable: false,
    bonusApplicable: false, minimumWageRule: "California State", taxRegimeRule: "Federal + State",
    investmentDeclarationRule: "W-4 Annual", form16Template: "W-2 Form", challanRule: "Quarterly 941",
    defaultPayslipTemplate: "US Payslip Template", showEmployerContribution: true,
    showCtcComponents: false, showYtd: true, showLopDays: true, showLeaveBalance: true,
    hideZeroComponents: true, defaultBankAccount: "Chase Salary - 1234567890",
    bankFileFormat: "Custom CSV", paymentApprovalRequired: true, paymentMode: "ACH",
    defaultArrearRule: "Manual", autoArrearOnRevision: true, autoArrearOnLopReversal: false,
    autoArrearOnAttendance: false, arrearApprovalRequired: true, showArrearSeparately: true,
    allowManualArrear: true, allowNegativeArrear: true, defaultArrearPayoutMonth: "Next Cycle",
    defaultFnfRule: "US Final Pay", autoFetchPayrollInputs: true, autoFetchLeaveEncashment: true,
    autoFetchNoticeRecovery: true, autoFetchLoanRecovery: false, autoFetchAssetRecovery: true,
    autoFetchArrear: true, fnfApprovalRequired: true, allowFnfAfterExit: true,
    generateFnfLetter: false, fnfPaymentTracking: true,
    payrollApprovalWorkflow: "Payroll Admin → Finance Manager",
    salaryStructureApprovalWorkflow: "Payroll Admin → HR Head",
    salaryRevisionApprovalWorkflow: "Manager → HR Head",
    arrearApprovalWorkflow: "Manager → Finance",
    fnfApprovalWorkflow: "HR → Finance",
    bankPaymentApprovalWorkflow: "Finance Manager",
    emailTemplateGroup: "US Payroll Emails",
    payrollFinalizedEmail: true, payslipPublishedEmail: true, salaryHoldEmail: true,
    salaryReleaseEmail: true, taxDeclarationReminder: true, investmentProofReminder: false,
    arrearApprovedEmail: true, fnfPaymentEmail: true, bankPaymentNotification: true,
    fetchAttendanceAuto: true, fetchLeaveAuto: true, fetchOvertimeAuto: true,
    fetchReimbursementAuto: true, fetchLoanDeductionAuto: false, fetchAssetRecoveryAuto: true,
    fetchOffboardingFnfAuto: true, fetchSalaryRevisionAuto: true, fetchArrearAuto: true,
    missingConfig: ["Loan integration disabled"], conflictWarnings: [],
    impactedEmployees: 36, createdBy: "Rajesh Kumar", createdAt: daysAgo(220), updatedAt: daysAgo(45),
  },
  {
    id: "epc-4", entity: "ACME Singapore Pte Ltd", country: "Singapore", state: "Singapore", currency: "SGD",
    useTenantDefault: true, overrideTenantDefault: false, status: "Active", priority: 4, version: 1,
    effectiveFrom: daysAgo(180), effectiveTo: undefined,
    payrollFrequency: "Monthly", payrollMonthStartDay: 1, payrollMonthEndDay: 31,
    payDate: "25th", attendanceCutOff: "20th", leaveCutOff: "20th",
    reimbursementCutOff: "20th", taxDeclarationCutOff: "Annual", loanDeductionCutOff: "Last Day",
    arrearCutOff: "Last Day", payrollLockDate: "Last Day", payslipPublishDate: "Pay Date",
    defaultPayGroup: "Singapore Monthly Payroll", defaultSalaryStructure: "Singapore Salary Structure",
    defaultComponentSet: "Singapore Payroll Components", defaultEmployeeSalaryRule: "Auto-assign on join",
    defaultSalaryRevisionRule: "Annual", defaultPayrollInputRule: "Manual + Auto",
    defaultLopRule: "Per day = CTC/26", defaultOvertimeRule: "Hourly @ 1.5x",
    defaultBonusRule: "Annual (AWS)", defaultReimbursementRule: "Monthly cap",
    complianceRule: "Singapore CPF Compliance", pfApplicable: false, esiApplicable: false,
    ptApplicable: false, lwfApplicable: false, tdsApplicable: false, gratuityApplicable: false,
    bonusApplicable: false, minimumWageRule: "Singapore MVP", taxRegimeRule: "Singapore Income Tax",
    investmentDeclarationRule: "N/A", form16Template: "IR8A Form", challanRule: "Annual filing",
    defaultPayslipTemplate: "Singapore Payslip Template", showEmployerContribution: true,
    showCtcComponents: true, showYtd: true, showLopDays: true, showLeaveBalance: true,
    hideZeroComponents: true, defaultBankAccount: "DBS Salary - 00123456789",
    bankFileFormat: "Custom CSV", paymentApprovalRequired: true, paymentMode: "GIRO",
    defaultArrearRule: "Manual", autoArrearOnRevision: true, autoArrearOnLopReversal: true,
    autoArrearOnAttendance: false, arrearApprovalRequired: true, showArrearSeparately: true,
    allowManualArrear: true, allowNegativeArrear: false, defaultArrearPayoutMonth: "Next Cycle",
    defaultFnfRule: "Singapore FnF", autoFetchPayrollInputs: true, autoFetchLeaveEncashment: true,
    autoFetchNoticeRecovery: true, autoFetchLoanRecovery: true, autoFetchAssetRecovery: true,
    autoFetchArrear: true, fnfApprovalRequired: true, allowFnfAfterExit: false,
    generateFnfLetter: true, fnfPaymentTracking: true,
    payrollApprovalWorkflow: "Payroll Admin → Finance Manager",
    salaryStructureApprovalWorkflow: "Payroll Admin → Finance",
    salaryRevisionApprovalWorkflow: "Manager → Finance",
    arrearApprovalWorkflow: "Manager → Finance",
    fnfApprovalWorkflow: "HR → Finance",
    bankPaymentApprovalWorkflow: "Finance Manager",
    emailTemplateGroup: "Singapore Payroll Emails",
    payrollFinalizedEmail: true, payslipPublishedEmail: true, salaryHoldEmail: true,
    salaryReleaseEmail: true, taxDeclarationReminder: false, investmentProofReminder: false,
    arrearApprovedEmail: true, fnfPaymentEmail: true, bankPaymentNotification: true,
    fetchAttendanceAuto: true, fetchLeaveAuto: true, fetchOvertimeAuto: true,
    fetchReimbursementAuto: true, fetchLoanDeductionAuto: true, fetchAssetRecoveryAuto: true,
    fetchOffboardingFnfAuto: true, fetchSalaryRevisionAuto: true, fetchArrearAuto: true,
    missingConfig: [], conflictWarnings: ["CPF integration pending"],
    impactedEmployees: 12, createdBy: "Rajesh Kumar", createdAt: daysAgo(180), updatedAt: daysAgo(20),
  },
]
