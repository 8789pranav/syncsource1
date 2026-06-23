"use client"

// Shared utilities for the Onboarding module

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

// ---------- Types ----------
export interface OnboardingStage {
  id: string
  name: string
  code: string
  order: number
  description?: string | null
  color: string
  icon: string
  stageType: string // start | standard | gate | end
  category: string // intake | process | review | gate | completion
  slaDays: number | null
  slaWarningDays: number | null
  isMilestone: boolean
  wipLimit: number | null
  blockOnOverflow: boolean
  entryGates?: string | null
  exitGates?: string | null
  defaultOwnerId?: string | null
  ownerType: string
  ownerRole?: string | null
  requiresForm: boolean
  formSchemaId?: string | null
  requiredDocuments?: string | null
  automations?: string | null
  isSkippable: boolean
  isRequired: boolean
  autoAdvance: boolean
  taskTemplates?: OnboardingTaskTemplate[]
  _count?: { instanceStages: number; currentCandidates: number }
  createdAt: string
  updatedAt: string
}

export interface OnboardingTaskTemplate {
  id: string
  title: string
  description?: string | null
  daysFromStage: number
  ownerType: string
  defaultOwnerId?: string | null
  isBlocking: boolean
  priority: string
  category: string
  order: number
}

export interface OnboardingWorkflow {
  id: string
  name: string
  code: string
  description?: string | null
  version: number
  status: string
  category: string
  isDefault: boolean
  applicability?: string | null
  icon: string
  color: string
  cardColorBy: string
  showSla: boolean
  showOwner: boolean
  showTaskCount: boolean
  allowBackward: boolean
  stages?: OnboardingStage[]
  _count?: { stages: number; candidates: number }
  createdAt: string
  updatedAt: string
}

export interface OnboardingCandidate {
  id: string
  candidateName: string
  email?: string | null
  phone?: string | null
  employeeCode?: string | null
  designation?: string | null
  department?: string | null
  grade?: string | null
  employmentType: string
  joinDate?: string | null
  reportTo?: string | null
  priority: string
  avatarColor: string
  tags?: string | null
  currentStageId?: string | null
  status: string
  progress: number
  ownerId?: string | null
  enteredAt?: string | null
  startedAt: string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  workflow?: { id: string; name: string; code: string; color: string }
  currentStage?: { id: string; name: string; order: number; color: string; slaDays: number | null } | null
  instance?: {
    id: string
    overallProgress: number
    isComplete: boolean
    stages?: any[]
    tasks?: any[]
  } | null
  notes?: any[]
}

// ---------- Color palette ----------
export const STAGE_COLORS = [
  { name: "Slate", value: "#64748b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Pink", value: "#ec4899" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
]

export const PRIORITY_COLORS: Record<string, string> = {
  Low: "#64748b",
  Medium: "#0ea5e9",
  High: "#f59e0b",
  Critical: "#ef4444",
}

export const STAGE_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  start: { label: "Start", color: "#22c55e", icon: "PlayCircle" },
  standard: { label: "Standard", color: "#64748b", icon: "Circle" },
  gate: { label: "Gate", color: "#f59e0b", icon: "ShieldCheck" },
  end: { label: "End", color: "#10b981", icon: "CheckCircle2" },
}

export const STAGE_CATEGORIES = [
  { value: "intake", label: "Intake", color: "#22c55e" },
  { value: "process", label: "Process", color: "#0ea5e9" },
  { value: "review", label: "Review", color: "#f59e0b" },
  { value: "gate", label: "Gate", color: "#ec4899" },
  { value: "completion", label: "Completion", color: "#10b981" },
]

export const WORKFLOW_CATEGORIES = [
  { value: "General", label: "General" },
  { value: "Fresher", label: "Fresher" },
  { value: "Lateral", label: "Lateral" },
  { value: "Leadership", label: "Leadership" },
  { value: "Intern", label: "Intern" },
  { value: "Contractor", label: "Contractor" },
]

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"]

export const PRIORITIES = ["Low", "Medium", "High", "Critical"]

// ---------- Fetch hook ----------
export function useFetch<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!url) {
      return
    }
    let active = true
    const doFetch = async () => {
      try {
        if (active) setLoading(true)
        const r = await fetch(url)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json = await r.json()
        if (active) {
          setData(json)
          setError(null)
        }
      } catch (e: any) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    doFetch()
    return () => {
      active = false
    }
  }, [url, reloadKey, ...deps])

  return { data, loading, error, reload, setData }
}

// ---------- API helpers ----------
export async function apiPost(url: string, body: any) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await r.json()
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export async function apiPatch(url: string, body: any) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await r.json()
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export async function apiDelete(url: string) {
  const r = await fetch(url, { method: "DELETE" })
  const json = await r.json()
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export function safeToast(promise: Promise<any>, successMsg?: string, errMsg?: string) {
  return promise
    .then((res) => {
      if (successMsg) toast.success(successMsg)
      return res
    })
    .catch((e) => {
      toast.error(errMsg || e.message || "Something went wrong")
      throw e
    })
}

// ---------- Helpers ----------
export function safeParseJson<T>(str?: string | null, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const f = new Date(from).getTime()
  const t = new Date(to).getTime()
  return Math.round((t - f) / (1000 * 60 * 60 * 24))
}

export function formatDate(d?: string | Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function timeAgo(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d)
}

export function slaStatus(enteredAt?: string | null, slaDays?: number | null): {
  status: "none" | "ok" | "warning" | "breached"
  daysLeft: number
  label: string
} {
  if (!enteredAt || !slaDays) return { status: "none", daysLeft: 0, label: "No SLA" }
  const due = new Date(enteredAt).getTime() + slaDays * 24 * 60 * 60 * 1000
  const now = Date.now()
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { status: "breached", daysLeft, label: `${Math.abs(daysLeft)}d overdue` }
  if (daysLeft <= 1) return { status: "breached", daysLeft, label: "Due today" }
  if (daysLeft <= 2) return { status: "warning", daysLeft, label: `${daysLeft}d left` }
  return { status: "ok", daysLeft, label: `${daysLeft}d left` }
}
