'use client'

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ModuleId } from "@/lib/types"

export interface RoleBrief {
  id: string
  code: string
  name: string
  roleType: string
  riskLevel?: string
}

export interface DataScope {
  scopeType: string
  entityId?: string | null
  departmentIds: string[]
  locationIds: string[]
  branchIds: string[]
  gradeIds: string[]
  includeEmployees: string[]
  excludeEmployees: string[]
}

export interface ModuleAccessDetail {
  accessLevel: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  canExport: boolean
  canImport: boolean
  canDownload: boolean
  canUpload: boolean
  reason: string
}

interface HrmsState {
  activeModule: ModuleId
  activeSubModule: string | null
  sidebarOpen: boolean
  theme: "light" | "dark"
  searchQuery: string
  // Permission-aware user simulation
  currentUserId: string | null
  currentUserName: string | null
  currentUserRole: string | null // role code e.g. "HR_ADMIN", "EMPLOYEE"
  currentRoleName: string | null
  currentRoleType: string | null
  currentRiskLevel: string | null
  allowedModules: ModuleId[] | null // null = not loaded yet = show all
  deniedModules: string[]
  fieldAccess: Record<string, Record<string, string>> // module -> field -> access
  dataScopes: DataScope[]
  conflicts: { module: string; field?: string; details: string }[]
  moduleAccess: Record<string, ModuleAccessDetail>
  isViewAs: boolean
  viewAsRoleId: string | null
  permissionsLoaded: boolean
  setCurrentUser: (data: {
    userId: string
    userName: string
    roleCode: string
    roleName?: string
    roleType?: string
    riskLevel?: string
    allowedModules: ModuleId[]
    deniedModules?: string[]
    fieldAccess?: Record<string, Record<string, string>>
    dataScopes?: DataScope[]
    conflicts?: { module: string; field?: string; details: string }[]
    moduleAccess?: Record<string, ModuleAccessDetail>
    isViewAs?: boolean
    viewAsRoleId?: string | null
  }) => void
  clearCurrentUser: () => void
  setModule: (m: ModuleId, sub?: string | null) => void
  setSubModule: (sub: string | null) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  setTheme: (t: "light" | "dark") => void
  setSearch: (q: string) => void
}

export const useHrmsStore = create<HrmsState>()(
  persist(
    (set) => ({
      activeModule: "dashboard",
      activeSubModule: null,
      sidebarOpen: true,
      theme: "light",
      searchQuery: "",
      currentUserId: null,
      currentUserName: null,
      currentUserRole: null,
      currentRoleName: null,
      currentRoleType: null,
      currentRiskLevel: null,
      allowedModules: null,
      deniedModules: [],
      fieldAccess: {},
      dataScopes: [],
      conflicts: [],
      moduleAccess: {},
      isViewAs: false,
      viewAsRoleId: null,
      permissionsLoaded: false,
      setCurrentUser: (d) => set({
        currentUserId: d.userId,
        currentUserName: d.userName,
        currentUserRole: d.roleCode,
        currentRoleName: d.roleName || null,
        currentRoleType: d.roleType || null,
        currentRiskLevel: d.riskLevel || null,
        allowedModules: d.allowedModules,
        deniedModules: d.deniedModules || [],
        fieldAccess: d.fieldAccess || {},
        dataScopes: d.dataScopes || [],
        conflicts: d.conflicts || [],
        moduleAccess: d.moduleAccess || {},
        isViewAs: d.isViewAs || false,
        viewAsRoleId: d.viewAsRoleId || null,
        permissionsLoaded: true,
      }),
      clearCurrentUser: () => set({
        currentUserId: null,
        currentUserName: null,
        currentUserRole: null,
        currentRoleName: null,
        currentRoleType: null,
        currentRiskLevel: null,
        allowedModules: null,
        deniedModules: [],
        fieldAccess: {},
        dataScopes: [],
        conflicts: [],
        moduleAccess: {},
        isViewAs: false,
        viewAsRoleId: null,
        permissionsLoaded: false,
      }),
      setModule: (m, sub = null) => set({ activeModule: m, activeSubModule: sub }),
      setSubModule: (sub) => set({ activeSubModule: sub }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (open) => set({ sidebarOpen: open }),
      setTheme: (t) => set({ theme: t }),
      setSearch: (q) => set({ searchQuery: q }),
    }),
    {
      name: "hrms-store",
      // Only persist UI preferences, not permission state (which must be re-fetched each load)
      partialize: (s) => ({
        activeModule: s.activeModule,
        activeSubModule: s.activeSubModule,
        sidebarOpen: s.sidebarOpen,
        theme: s.theme,
        searchQuery: s.searchQuery,
      } as any),
    }
  )
)
