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
