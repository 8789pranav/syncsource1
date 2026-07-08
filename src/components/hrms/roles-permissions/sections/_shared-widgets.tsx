'use client'

import * as React from "react"
import { Check, ChevronDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { apiFetch } from "@/lib/api-client"

// ============================================================
// Option type used by all pickers
// ============================================================
export interface PickerOption {
  label: string
  value: string
  meta?: string
}

// ============================================================
// MultiSelect — fetches options from an API endpoint, allows multiple selection
// ============================================================
export function MultiSelect({
  endpoint,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
}: {
  endpoint: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<PickerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(endpoint)
      const data = await res.json()
      const items: PickerOption[] = (data.items || []).map((it: any) => ({
        label: it.label || it.name || it.legalName || it.code || it.id,
        value: it.value || it.id,
        meta: it.code || it.employeeCode || it.tradeName,
      }))
      setOptions(items)
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  React.useEffect(() => {
    if (open && options.length === 0) load()
  }, [open, options.length, load])

  const selectedLabels = value.map(v => options.find(o => o.value === v)).filter(Boolean) as PickerOption[]
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || (o.meta || "").toLowerCase().includes(query.toLowerCase()))
    : options

  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter(v => v !== val))
    else onChange([...value, val])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-9"
        >
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
            {value.length === 0 ? placeholder : value.length === 1 ? selectedLabels[0]?.label : `${value.length} selected`}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No items found."}</CommandEmpty>
            <CommandGroup>
              {filtered.map(o => {
                const selected = value.includes(o.value)
                return (
                  <CommandItem key={o.value} value={o.value} onSelect={() => toggle(o.value)}>
                    <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{o.label}</p>
                      {o.meta && <p className="text-xs text-muted-foreground truncate">{o.meta}</p>}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
          {selectedLabels.map(o => (
            <Badge key={o.value} variant="secondary" className="text-xs gap-1 pr-1">
              <span className="truncate max-w-[180px]">{o.label}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter(v => v !== o.value))}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${o.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </Popover>
  )
}

// ============================================================
// SingleSelect — combobox-style single selection
// ============================================================
export function SingleSelect({
  endpoint,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
}: {
  endpoint: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<PickerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(endpoint)
      const data = await res.json()
      const items: PickerOption[] = (data.items || []).map((it: any) => ({
        label: it.label || it.name || it.legalName || it.code || it.id,
        value: it.value || it.id,
        meta: it.code || it.employeeCode || it.tradeName,
      }))
      setOptions(items)
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  React.useEffect(() => {
    if (open && options.length === 0) load()
  }, [open, options.length, load])

  const selected = options.find(o => o.value === value)
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || (o.meta || "").toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-9"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No items found."}</CommandEmpty>
            <CommandGroup>
              {filtered.map(o => (
                <CommandItem key={o.value} value={o.value} onSelect={() => { onChange(o.value); setOpen(false) }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{o.label}</p>
                    {o.meta && <p className="text-xs text-muted-foreground truncate">{o.meta}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Helpers
// ============================================================
export function fmtDate(v?: string | null) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

export function fmtDateTime(v?: string | null) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return "—"
  }
}

export function empName(e?: { firstName?: string | null; middleName?: string | null; lastName?: string | null; displayName?: string | null; employeeCode?: string } | null) {
  if (!e) return "—"
  const full = e.displayName || [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ") || e.employeeCode || "—"
  return full
}

export function empInitials(e?: { firstName?: string | null; middleName?: string | null; lastName?: string | null; displayName?: string | null } | null) {
  if (!e) return "?"
  const full = e.displayName || [e.firstName, e.lastName].filter(Boolean).join(" ")
  if (!full) return "?"
  return full.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
}

export function empAvatarColor(seed?: string) {
  const colors = [
    "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500",
    "bg-cyan-500", "bg-fuchsia-500", "bg-teal-500", "bg-orange-500",
  ]
  if (!seed) return colors[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return colors[Math.abs(h) % colors.length]
}

export function daysBetween(a: Date | string, b: Date | string) {
  const d1 = new Date(a).getTime()
  const d2 = new Date(b).getTime()
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)))
}
