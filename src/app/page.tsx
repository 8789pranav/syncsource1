'use client'
import { Shell } from "@/components/hrms/shell"
import { ErrorBoundary } from "@/components/hrms/error-boundary"
import { useHrmsStore } from "@/store/hrms-store"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const loading = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)

const DashboardModule = dynamic(() => import("@/components/hrms/modules/dashboard").then(m => ({ default: m.DashboardModule })), { loading })
const OrganizationModule = dynamic(() => import("@/components/hrms/modules/organization").then(m => ({ default: m.OrganizationModule })), { loading })
const EmployeesModule = dynamic(() => import("@/components/hrms/modules/employees").then(m => ({ default: m.EmployeesModule })), { loading })
const OnboardingModule = dynamic(() => import("@/components/hrms/modules/onboarding").then(m => ({ default: m.OnboardingModule })), { loading })
const OffboardingModule = dynamic(() => import("@/components/hrms/modules/offboarding").then(m => ({ default: m.OffboardingModule })), { loading })
const LeaveModule = dynamic(() => import("@/components/hrms/modules/leave").then(m => ({ default: m.LeaveModule })), { loading })
const ShiftModule = dynamic(() => import("@/components/hrms/modules/shift").then(m => ({ default: m.ShiftModule })), { loading })
const RosterModule = dynamic(() => import("@/components/hrms/modules/roster").then(m => ({ default: m.RosterModule })), { loading })
const AttendanceModule = dynamic(() => import("@/components/hrms/attendance").then(m => ({ default: m.AttendanceModule })), { loading })
const HolidayModule = dynamic(() => import("@/components/hrms/modules/holiday").then(m => ({ default: m.HolidayModule })), { loading })
const AssetsModule = dynamic(() => import("@/components/hrms/modules/asset").then(m => ({ default: m.AssetsModule })), { loading })
const PayrollModule = dynamic(() => import("@/components/hrms/modules/payroll").then(m => ({ default: m.PayrollModule })), { loading })
const DocumentsModule = dynamic(() => import("@/components/hrms/modules/documents").then(m => ({ default: m.DocumentsModule })), { loading })
const FormsModule = dynamic(() => import("@/components/hrms/modules/forms").then(m => ({ default: m.FormsModule })), { loading })
const WorkflowsModule = dynamic(() => import("@/components/hrms/modules/workflows").then(m => ({ default: m.WorkflowsModule })), { loading })
const AnnouncementsModule = dynamic(() => import("@/components/hrms/modules/announcements").then(m => ({ default: m.AnnouncementsModule })), { loading })
const AuditModule = dynamic(() => import("@/components/hrms/modules/audit").then(m => ({ default: m.AuditModule })), { loading })
const SettingsModule = dynamic(() => import("@/components/hrms/modules/settings").then(m => ({ default: m.SettingsModule })), { loading })

export default function Home() {
  const { activeModule } = useHrmsStore()
  return (
    <Shell>
      <ErrorBoundary>
      {activeModule === "dashboard" && <DashboardModule />}
      {activeModule === "organization" && <OrganizationModule />}
      {activeModule === "employees" && <EmployeesModule />}
      {activeModule === "onboarding" && <OnboardingModule />}
      {activeModule === "offboarding" && <OffboardingModule />}
      {activeModule === "leave" && <LeaveModule />}
      {activeModule === "shift" && <ShiftModule />}
      {activeModule === "roster" && <RosterModule />}
      {activeModule === "attendance" && <AttendanceModule />}
      {activeModule === "holiday" && <HolidayModule />}
      {activeModule === "asset" && <AssetsModule />}
      {activeModule === "payroll" && <PayrollModule />}
      {activeModule === "documents" && <DocumentsModule />}
      {activeModule === "forms" && <FormsModule />}
      {activeModule === "workflows" && <WorkflowsModule />}
      {activeModule === "announcements" && <AnnouncementsModule />}
      {activeModule === "audit" && <AuditModule />}
      {activeModule === "settings" && <SettingsModule />}
      </ErrorBoundary>
    </Shell>
  )
}
