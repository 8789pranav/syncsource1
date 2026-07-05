'use client'

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ModuleId } from "@/lib/types"

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
  allowedModules: ModuleId[] | null // null = not loaded yet = show all
  setCurrentUser: (userId: string, userName: string, roleCode: string, allowedModules: ModuleId[]) => void
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
      allowedModules: null,
      setCurrentUser: (userId, userName, roleCode, allowedModules) => set({ currentUserId: userId, currentUserName: userName, currentUserRole: roleCode, allowedModules }),
      clearCurrentUser: () => set({ currentUserId: null, currentUserName: null, currentUserRole: null, allowedModules: null }),
      setModule: (m, sub = null) => set({ activeModule: m, activeSubModule: sub }),
      setSubModule: (sub) => set({ activeSubModule: sub }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (open) => set({ sidebarOpen: open }),
      setTheme: (t) => set({ theme: t }),
      setSearch: (q) => set({ searchQuery: q }),
    }),
    { name: "hrms-store" }
  )
)
