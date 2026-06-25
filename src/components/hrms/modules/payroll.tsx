"use client"

// ============================================================
// PayrollModule — Enterprise Payroll (Phase 3 rebuild)
// ------------------------------------------------------------
// 5 main menus with nested sub-sections:
//   1. Salary       — Dashboard, Payroll Run, Payroll Inputs, Pay Groups,
//                     Payroll Components, Salary Structure, Employee Salary,
//                     Salary Revision, Payslips, Bank/Payment, Reports
//   2. Compliance   — Dashboard, Statutory Setup, PF/EPF, ESI, PT, LWF,
//                     TDS/Income Tax, Investment Declaration, Form 16,
//                     Challans/Payments, Reports
//   3. Arrear       — Dashboard, Arrear Inputs, Arrear Calculation,
//                     Salary Revision Arrear, LOP Reversal Arrear, Manual Arrear,
//                     Arrear Approval, Arrear Payment, Reports
//   4. Full & Final — Dashboard, FnF Cases, FnF Inputs, FnF Calculation,
//                     Leave Encashment, Notice Recovery, Asset/Loan Recovery,
//                     FnF Approval, FnF Payment, FnF Letters, Reports
//   5. Settings     — General, Entity Configuration (flagship 9-step wizard),
//                     Pay Group, Component, Structure, Calendar, Integration,
//                     Compliance, Tax, Arrear, FnF, Payslip, Bank, Approval,
//                     Email, Import/Export, Audit & Security
// ============================================================

import * as React from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
  Banknote, Wallet, Receipt, FileText, Settings as SettingsIcon,
  LayoutDashboard, Play, ListChecks, Users, Layers, FileSpreadsheet,
  UserSquare, TrendingUp, FileText as PayslipIcon, Landmark, BarChart3,
  ShieldCheck, Building2, PiggyBank, HeartPulse, Briefcase, HandCoins,
  FileCheck, CalendarClock, Coins, ArrowLeftRight, ClipboardCheck,
  Inbox, Calculator, GitCompareArrows, Undo2, Hand, CheckCircle2, Mail,
  SlidersHorizontal, Globe, Calendar, Plug, BadgePercent, FileSliders,
  ScrollText, Upload, Lock, ChevronRight, Menu, X, Package,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ---------- Lazy-loaded sections ----------
const loading = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
  </div>
)

// Salary
const SalaryDashboard = dynamic(() => import("@/components/hrms/payroll/sections/salary-dashboard").then(m => m.SalaryDashboardSection), { loading, ssr: false })
const PayrollRun = dynamic(() => import("@/components/hrms/payroll/sections/payroll-run").then(m => m.PayrollRunSection), { loading, ssr: false })
const PayrollInputs = dynamic(() => import("@/components/hrms/payroll/sections/payroll-inputs").then(m => m.PayrollInputsSection), { loading, ssr: false })
const PayGroups = dynamic(() => import("@/components/hrms/payroll/sections/pay-groups").then(m => m.PayGroupsSection), { loading, ssr: false })
const PayrollComponents = dynamic(() => import("@/components/hrms/payroll/sections/payroll-components").then(m => m.PayrollComponentsSection), { loading, ssr: false })
const SalaryStructure = dynamic(() => import("@/components/hrms/payroll/sections/salary-structure").then(m => m.SalaryStructureSection), { loading, ssr: false })
const EmployeeSalary = dynamic(() => import("@/components/hrms/payroll/sections/employee-salary").then(m => m.EmployeeSalarySection), { loading, ssr: false })
const SalaryRevision = dynamic(() => import("@/components/hrms/payroll/sections/salary-revision").then(m => m.SalaryRevisionSection), { loading, ssr: false })
const Payslips = dynamic(() => import("@/components/hrms/payroll/sections/payslips").then(m => m.PayslipsSection), { loading, ssr: false })
const BankPayment = dynamic(() => import("@/components/hrms/payroll/sections/bank-payment").then(m => m.BankPaymentSection), { loading, ssr: false })
const SalaryReports = dynamic(() => import("@/components/hrms/payroll/sections/salary-reports").then(m => m.SalaryReportsSection), { loading, ssr: false })

// Compliance
const ComplianceDashboard = dynamic(() => import("@/components/hrms/payroll/sections/compliance-dashboard").then(m => m.ComplianceDashboardSection), { loading, ssr: false })
const StatutorySetup = dynamic(() => import("@/components/hrms/payroll/sections/statutory-setup").then(m => m.StatutorySetupSection), { loading, ssr: false })
const PFRecords = dynamic(() => import("@/components/hrms/payroll/sections/pf-records").then(m => m.PFRecordsSection), { loading, ssr: false })
const ESIRecords = dynamic(() => import("@/components/hrms/payroll/sections/esi-records").then(m => m.ESIRecordsSection), { loading, ssr: false })
const PTRecords = dynamic(() => import("@/components/hrms/payroll/sections/pt-records").then(m => m.PTRecordsSection), { loading, ssr: false })
const LWFRecords = dynamic(() => import("@/components/hrms/payroll/sections/lwf-records").then(m => m.LWFRecordsSection), { loading, ssr: false })
const TDSRecords = dynamic(() => import("@/components/hrms/payroll/sections/tds-records").then(m => m.TDSRecordsSection), { loading, ssr: false })
const InvestmentDeclaration = dynamic(() => import("@/components/hrms/payroll/sections/investment-declaration").then(m => m.InvestmentDeclarationSection), { loading, ssr: false })
const Form16 = dynamic(() => import("@/components/hrms/payroll/sections/form-16").then(m => m.Form16Section), { loading, ssr: false })
const Challans = dynamic(() => import("@/components/hrms/payroll/sections/challans").then(m => m.ChallansSection), { loading, ssr: false })
const ComplianceReports = dynamic(() => import("@/components/hrms/payroll/sections/compliance-reports").then(m => m.ComplianceReportsSection), { loading, ssr: false })

// Arrear
const ArrearDashboard = dynamic(() => import("@/components/hrms/payroll/sections/arrear-dashboard").then(m => m.ArrearDashboardSection), { loading, ssr: false })
const ArrearInputs = dynamic(() => import("@/components/hrms/payroll/sections/arrear-inputs").then(m => m.ArrearInputsSection), { loading, ssr: false })
const ArrearCalculation = dynamic(() => import("@/components/hrms/payroll/sections/arrear-calculation").then(m => m.ArrearCalculationSection), { loading, ssr: false })
const SalaryRevisionArrear = dynamic(() => import("@/components/hrms/payroll/sections/salary-revision-arrear").then(m => m.SalaryRevisionArrearSection), { loading, ssr: false })
const LopReversalArrear = dynamic(() => import("@/components/hrms/payroll/sections/lop-reversal-arrear").then(m => m.LopReversalArrearSection), { loading, ssr: false })
const ManualArrear = dynamic(() => import("@/components/hrms/payroll/sections/manual-arrear").then(m => m.ManualArrearSection), { loading, ssr: false })
const ArrearApproval = dynamic(() => import("@/components/hrms/payroll/sections/arrear-approval").then(m => m.ArrearApprovalSection), { loading, ssr: false })
const ArrearPayment = dynamic(() => import("@/components/hrms/payroll/sections/arrear-payment").then(m => m.ArrearPaymentSection), { loading, ssr: false })
const ArrearReports = dynamic(() => import("@/components/hrms/payroll/sections/arrear-reports").then(m => m.ArrearReportsSection), { loading, ssr: false })

// Full & Final
const FnFDashboard = dynamic(() => import("@/components/hrms/payroll/sections/fnf-dashboard").then(m => m.FnFDashboardSection), { loading, ssr: false })
const FnFCases = dynamic(() => import("@/components/hrms/payroll/sections/fnf-cases").then(m => m.FnFCasesSection), { loading, ssr: false })
const FnFInputs = dynamic(() => import("@/components/hrms/payroll/sections/fnf-inputs").then(m => m.FnFInputsSection), { loading, ssr: false })
const FnFCalculation = dynamic(() => import("@/components/hrms/payroll/sections/fnf-calculation").then(m => m.FnFCalculationSection), { loading, ssr: false })
const LeaveEncashment = dynamic(() => import("@/components/hrms/payroll/sections/leave-encashment").then(m => m.LeaveEncashmentSection), { loading, ssr: false })
const NoticeRecovery = dynamic(() => import("@/components/hrms/payroll/sections/notice-recovery").then(m => m.NoticeRecoverySection), { loading, ssr: false })
const AssetLoanRecovery = dynamic(() => import("@/components/hrms/payroll/sections/asset-loan-recovery").then(m => m.AssetLoanRecoverySection), { loading, ssr: false })
const FnFApproval = dynamic(() => import("@/components/hrms/payroll/sections/fnf-approval").then(m => m.FnFApprovalSection), { loading, ssr: false })
const FnFPayment = dynamic(() => import("@/components/hrms/payroll/sections/fnf-payment").then(m => m.FnFPaymentSection), { loading, ssr: false })
const FnFLetters = dynamic(() => import("@/components/hrms/payroll/sections/fnf-letters").then(m => m.FnFLettersSection), { loading, ssr: false })
const FnFReports = dynamic(() => import("@/components/hrms/payroll/sections/fnf-reports").then(m => m.FnFReportsSection), { loading, ssr: false })

// Settings
const GeneralSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-general").then(m => m.GeneralSettingsSection), { loading, ssr: false })
const EntityConfiguration = dynamic(() => import("@/components/hrms/payroll/sections/entity-configuration").then(m => m.EntityConfigurationSection), { loading, ssr: false })
const PayGroupSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-pay-group").then(m => m.PayGroupSettingsSection), { loading, ssr: false })
const ComponentSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-component").then(m => m.ComponentSettingsSection), { loading, ssr: false })
const StructureSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-structure").then(m => m.StructureSettingsSection), { loading, ssr: false })
const CalendarSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-calendar").then(m => m.CalendarSettingsSection), { loading, ssr: false })
const IntegrationSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-integration").then(m => m.IntegrationSettingsSection), { loading, ssr: false })
const ComplianceSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-compliance").then(m => m.ComplianceSettingsSection), { loading, ssr: false })
const TaxSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-tax").then(m => m.TaxSettingsSection), { loading, ssr: false })
const ArrearSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-arrear").then(m => m.ArrearSettingsSection), { loading, ssr: false })
const FnFSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-fnf").then(m => m.FnFSettingsSection), { loading, ssr: false })
const PayslipSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-payslip").then(m => m.PayslipSettingsSection), { loading, ssr: false })
const BankSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-bank").then(m => m.BankSettingsSection), { loading, ssr: false })
const ApprovalSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-approval").then(m => m.ApprovalSettingsSection), { loading, ssr: false })
const EmailSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-email").then(m => m.EmailSettingsSection), { loading, ssr: false })
const ImportExportSettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-import-export").then(m => m.ImportExportSettingsSection), { loading, ssr: false })
const AuditSecuritySettings = dynamic(() => import("@/components/hrms/payroll/sections/settings-audit-security").then(m => m.AuditSecuritySettingsSection), { loading, ssr: false })

// ---------- Menu structure ----------
interface SubItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}
interface MainMenu {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string // tailwind gradient e.g. "from-teal-500 to-cyan-500"
  description: string
  children: SubItem[]
}

const MENUS: MainMenu[] = [
  {
    id: "salary", label: "Salary", icon: Wallet, accent: "from-teal-500 to-cyan-500",
    description: "Run monthly payroll, manage pay groups, components, structures, employee salaries, revisions, payslips & bank payments",
    children: [
      { id: "salary-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "payroll-run", label: "Payroll Run", icon: Play },
      { id: "payroll-inputs", label: "Payroll Inputs", icon: ListChecks },
      { id: "pay-groups", label: "Pay Groups", icon: Users },
      { id: "payroll-components", label: "Payroll Components", icon: Layers },
      { id: "salary-structure", label: "Salary Structure", icon: FileSpreadsheet },
      { id: "employee-salary", label: "Employee Salary", icon: UserSquare },
      { id: "salary-revision", label: "Salary Revision", icon: TrendingUp },
      { id: "payslips", label: "Payslips", icon: PayslipIcon },
      { id: "bank-payment", label: "Bank / Payment", icon: Landmark },
      { id: "salary-reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "compliance", label: "Compliance", icon: ShieldCheck, accent: "from-emerald-500 to-teal-500",
    description: "Statutory setup, PF/EPF, ESI, PT, LWF, TDS, investment declarations, Form 16, challans & filings",
    children: [
      { id: "compliance-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "statutory-setup", label: "Statutory Setup", icon: Building2 },
      { id: "pf-records", label: "PF / EPF", icon: PiggyBank },
      { id: "esi-records", label: "ESI", icon: HeartPulse },
      { id: "pt-records", label: "Professional Tax", icon: Briefcase },
      { id: "lwf-records", label: "Labour Welfare Fund", icon: HandCoins },
      { id: "tds-records", label: "TDS / Income Tax", icon: FileCheck },
      { id: "investment-declaration", label: "Investment Declaration", icon: CalendarClock },
      { id: "form-16", label: "Form 16", icon: FileText },
      { id: "challans", label: "Challans / Payments", icon: Coins },
      { id: "compliance-reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "arrear", label: "Arrear", icon: ArrowLeftRight, accent: "from-amber-500 to-orange-500",
    description: "Calculate, approve & pay salary arrears from revisions, LOP reversals, attendance corrections & manual entries",
    children: [
      { id: "arrear-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "arrear-inputs", label: "Arrear Inputs", icon: Inbox },
      { id: "arrear-calculation", label: "Arrear Calculation", icon: Calculator },
      { id: "salary-revision-arrear", label: "Salary Revision Arrear", icon: GitCompareArrows },
      { id: "lop-reversal-arrear", label: "LOP Reversal Arrear", icon: Undo2 },
      { id: "manual-arrear", label: "Manual Arrear", icon: Hand },
      { id: "arrear-approval", label: "Arrear Approval", icon: CheckCircle2 },
      { id: "arrear-payment", label: "Arrear Payment", icon: Wallet },
      { id: "arrear-reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "fnf", label: "Full & Final", icon: Receipt, accent: "from-rose-500 to-pink-500",
    description: "Settle employee exits — auto-fetch payroll, leave encashment, notice recovery, asset/loan recovery, generate letters & track payments",
    children: [
      { id: "fnf-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "fnf-cases", label: "FnF Cases", icon: ClipboardCheck },
      { id: "fnf-inputs", label: "FnF Inputs", icon: Inbox },
      { id: "fnf-calculation", label: "FnF Calculation", icon: Calculator },
      { id: "leave-encashment", label: "Leave Encashment", icon: CalendarClock },
      { id: "notice-recovery", label: "Notice Recovery", icon: ScrollText },
      { id: "asset-loan-recovery", label: "Asset / Loan Recovery", icon: Package },
      { id: "fnf-approval", label: "FnF Approval", icon: CheckCircle2 },
      { id: "fnf-payment", label: "FnF Payment", icon: Wallet },
      { id: "fnf-letters", label: "FnF Letters", icon: FileText },
      { id: "fnf-reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "settings", label: "Settings", icon: SettingsIcon, accent: "from-slate-500 to-slate-600",
    description: "Configure payroll defaults, entity-wise configuration (flagship 9-step wizard), pay groups, components, structures, calendar, integrations, compliance, tax, arrear, FnF, payslip, bank, approvals, emails, import/export & audit",
    children: [
      { id: "settings-general", label: "General Settings", icon: SlidersHorizontal },
      { id: "entity-configuration", label: "Entity Configuration", icon: Building2 },
      { id: "settings-pay-group", label: "Pay Group Settings", icon: Users },
      { id: "settings-component", label: "Salary Component Settings", icon: Layers },
      { id: "settings-structure", label: "Salary Structure Settings", icon: FileSpreadsheet },
      { id: "settings-calendar", label: "Payroll Calendar Settings", icon: Calendar },
      { id: "settings-integration", label: "Attendance / Leave Integration", icon: Plug },
      { id: "settings-compliance", label: "Compliance Settings", icon: ShieldCheck },
      { id: "settings-tax", label: "Tax Settings", icon: BadgePercent },
      { id: "settings-arrear", label: "Arrear Settings", icon: ArrowLeftRight },
      { id: "settings-fnf", label: "FnF Settings", icon: Receipt },
      { id: "settings-payslip", label: "Payslip Settings", icon: FileSliders },
      { id: "settings-bank", label: "Bank Settings", icon: Landmark },
      { id: "settings-approval", label: "Approval Settings", icon: CheckCircle2 },
      { id: "settings-email", label: "Email Settings", icon: Mail },
      { id: "settings-import-export", label: "Import / Export Settings", icon: Upload },
      { id: "settings-audit-security", label: "Audit & Security", icon: Lock },
    ],
  },
]

// ============================================================
// Main Module
// ============================================================
export function PayrollModule() {
  const [activeMenu, setActiveMenu] = React.useState("salary")
  const [activeSection, setActiveSection] = React.useState("salary-dashboard")
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // When main menu changes, auto-select first child
  const switchMenu = (menuId: string) => {
    const menu = MENUS.find(m => m.id === menuId)
    if (menu && menu.children.length > 0) {
      setActiveMenu(menuId)
      setActiveSection(menu.children[0].id)
      setMobileOpen(false)
    }
  }

  const currentMenu = MENUS.find(m => m.id === activeMenu)!
  const currentSection = currentMenu.children.find(s => s.id === activeSection) || currentMenu.children[0]

  const renderSection = () => {
    switch (activeSection) {
      // Salary
      case "salary-dashboard": return <SalaryDashboard />
      case "payroll-run": return <PayrollRun />
      case "payroll-inputs": return <PayrollInputs />
      case "pay-groups": return <PayGroups />
      case "payroll-components": return <PayrollComponents />
      case "salary-structure": return <SalaryStructure />
      case "employee-salary": return <EmployeeSalary />
      case "salary-revision": return <SalaryRevision />
      case "payslips": return <Payslips />
      case "bank-payment": return <BankPayment />
      case "salary-reports": return <SalaryReports />
      // Compliance
      case "compliance-dashboard": return <ComplianceDashboard />
      case "statutory-setup": return <StatutorySetup />
      case "pf-records": return <PFRecords />
      case "esi-records": return <ESIRecords />
      case "pt-records": return <PTRecords />
      case "lwf-records": return <LWFRecords />
      case "tds-records": return <TDSRecords />
      case "investment-declaration": return <InvestmentDeclaration />
      case "form-16": return <Form16 />
      case "challans": return <Challans />
      case "compliance-reports": return <ComplianceReports />
      // Arrear
      case "arrear-dashboard": return <ArrearDashboard />
      case "arrear-inputs": return <ArrearInputs />
      case "arrear-calculation": return <ArrearCalculation />
      case "salary-revision-arrear": return <SalaryRevisionArrear />
      case "lop-reversal-arrear": return <LopReversalArrear />
      case "manual-arrear": return <ManualArrear />
      case "arrear-approval": return <ArrearApproval />
      case "arrear-payment": return <ArrearPayment />
      case "arrear-reports": return <ArrearReports />
      // FnF
      case "fnf-dashboard": return <FnFDashboard />
      case "fnf-cases": return <FnFCases />
      case "fnf-inputs": return <FnFInputs />
      case "fnf-calculation": return <FnFCalculation />
      case "leave-encashment": return <LeaveEncashment />
      case "notice-recovery": return <NoticeRecovery />
      case "asset-loan-recovery": return <AssetLoanRecovery />
      case "fnf-approval": return <FnFApproval />
      case "fnf-payment": return <FnFPayment />
      case "fnf-letters": return <FnFLetters />
      case "fnf-reports": return <FnFReports />
      // Settings
      case "settings-general": return <GeneralSettings />
      case "entity-configuration": return <EntityConfiguration />
      case "settings-pay-group": return <PayGroupSettings />
      case "settings-component": return <ComponentSettings />
      case "settings-structure": return <StructureSettings />
      case "settings-calendar": return <CalendarSettings />
      case "settings-integration": return <IntegrationSettings />
      case "settings-compliance": return <ComplianceSettings />
      case "settings-tax": return <TaxSettings />
      case "settings-arrear": return <ArrearSettings />
      case "settings-fnf": return <FnFSettings />
      case "settings-payslip": return <PayslipSettings />
      case "settings-bank": return <BankSettings />
      case "settings-approval": return <ApprovalSettings />
      case "settings-email": return <EmailSettings />
      case "settings-import-export": return <ImportExportSettings />
      case "settings-audit-security": return <AuditSecuritySettings />
      default: return null
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Module header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className={cn("rounded-xl bg-gradient-to-br p-2.5 text-white shadow-sm", currentMenu.accent)}>
            <currentMenu.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                Payroll — {currentMenu.label}
              </h1>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {currentMenu.children.length} sections
              </Badge>
            </div>
            <p className="mt-0.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {currentMenu.description}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Sections
        </Button>
      </motion.div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar — main menus + sub items */}
        <aside
          className={cn(
            "lg:w-72 lg:flex-shrink-0",
            mobileOpen ? "block" : "hidden lg:block"
          )}
        >
          <div className="sticky top-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
            {/* Main menu tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 dark:border-slate-700">
              {MENUS.map(m => {
                const active = activeMenu === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => switchMenu(m.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                      active
                        ? cn("bg-gradient-to-r text-white shadow-sm", m.accent)
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>

            {/* Sub items */}
            <nav className="max-h-[calc(100vh-220px)] overflow-y-auto p-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMenu}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-0.5"
                >
                  {currentMenu.children.map(child => {
                    const active = activeSection === child.id
                    return (
                      <button
                        key={child.id}
                        onClick={() => { setActiveSection(child.id); setMobileOpen(false) }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                          active
                            ? cn("bg-gradient-to-r text-white shadow-sm", currentMenu.accent)
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{child.label}</span>
                        {active && <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default PayrollModule
