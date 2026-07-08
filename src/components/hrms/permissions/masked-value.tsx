'use client'

// ============================================================
// MaskedValue — permission-aware sensitive value renderer.
// ------------------------------------------------------------
// Reads the current viewer's field-level permission from the
// store and renders accordingly:
//   • Hidden        → "—" (no reveal possible)
//   • Masked        → masked value, NO reveal toggle (forced)
//   • ViewOnlyOwn   → masked unless viewer is the owner
//   • View          → masked by default, eye toggle to reveal
//   • Edit/Required → full value, eye toggle to hide
//
// Logs a "SensitiveDataViewed" audit event when the user
// reveals a masked sensitive field (best-effort, fire-and-forget).
// ============================================================

import * as React from "react"
import { Eye, EyeOff, Lock, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/lib/use-permissions"
import { maskValue } from "@/lib/permissions-constants"
import { apiFetch } from "@/lib/api-client"

interface MaskedValueProps {
  module: string
  field: string
  value: string | number | null | undefined
  /** Masking style hint; defaults inferred from field name. */
  maskStyle?: "account" | "pan" | "aadhaar" | "ifsc" | "salary" | "generic"
  /** Render as a compact inline span instead of a row. */
  inline?: boolean
  className?: string
  /** Show a small "restricted" badge next to the value. */
  showBadge?: boolean
  /** Whether this record belongs to the viewer (for ViewOnlyOwn). */
  isOwn?: boolean
}

export function MaskedValue({
  module,
  field,
  value,
  maskStyle = "generic",
  inline = false,
  className,
  showBadge = false,
  isOwn = false,
}: MaskedValueProps) {
  const perm = usePermissions()
  const [revealed, setRevealed] = React.useState(false)
  const access = perm.getFieldAccess(module, field)

  // Reset reveal when access changes
  React.useEffect(() => { setRevealed(false) }, [access, value])

  // Hidden
  if (access === "Hidden") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)} title="You don't have permission to view this field">
        <Lock className="h-3 w-3" />
        <span className="text-xs">Restricted</span>
      </span>
    )
  }

  // ViewOnlyOwn — allow if owner, else mask
  if (access === "ViewOnlyOwn" && !isOwn) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="font-mono text-sm tracking-wider text-muted-foreground">{maskByStyle(value, maskStyle)}</span>
        {showBadge && <ShieldAlert className="h-3 w-3 text-amber-500" />}
      </span>
    )
  }

  // Masked (forced) — no reveal allowed
  if (access === "Masked") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)} title="Masked by your role's field permission">
        <span className="font-mono text-sm tracking-wider">{maskByStyle(value, maskStyle)}</span>
        <Lock className="h-3 w-3 text-amber-500" />
      </span>
    )
  }

  // View / Edit / Required — masked by default, eye toggle to reveal
  const showValue = revealed || access === "Edit" || access === "Required"
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("font-mono text-sm tracking-wider", !showValue && "text-muted-foreground")}>
        {showValue ? (String(value ?? "—") || "—") : maskByStyle(value, maskStyle)}
      </span>
      {showBadge && access === "View" && (
        <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">RESTRICTED</span>
      )}
      <button
        type="button"
        onClick={() => {
          const next = !revealed
          setRevealed(next)
          // Best-effort audit log when revealing sensitive data
          if (next && value) {
            try {
              apiFetch("/api/roles-permissions/logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "SensitiveDataViewed",
                  module,
                  targetType: "field",
                  targetId: field,
                  reason: `Revealed ${field} value`,
                  status: "Success",
                }),
              }).catch(() => {})
            } catch {}
          }
        }}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
        title={revealed ? "Hide" : "Reveal"}
        aria-label={revealed ? "Hide value" : "Reveal value"}
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}

// Style-aware masking
function maskByStyle(value: string | number | null | undefined, style: string): string {
  if (value === null || value === undefined || value === "") return "—"
  const s = String(value)
  switch (style) {
    case "account":
      // Bank account — show last 4
      if (s.length <= 4) return "XXXX"
      return `XXXX${s.slice(-4)}`
    case "pan":
      // PAN — show first 2 + last 2
      if (s.length <= 4) return "****"
      return `${s.slice(0, 2)}****${s.slice(-2)}`
    case "aadhaar":
      // Aadhaar — XXXX-XXXX-1234
      if (s.length <= 4) return "XXXX"
      return `XXXX-XXXX-${s.slice(-4)}`
    case "ifsc":
      // IFSC — first 4 + XXXX
      if (s.length <= 4) return "XXXX"
      return `${s.slice(0, 4)}XXXX`
    case "salary":
      // Salary — round to nearest lakh
      const n = Number(s.replace(/[^0-9.]/g, ""))
      if (!n) return "₹ ••••••"
      return `₹ ${Math.round(n / 100000)} LPA`
    default:
      return maskValue(s, "partial")
  }
}
