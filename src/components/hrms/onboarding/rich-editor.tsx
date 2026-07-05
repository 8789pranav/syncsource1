"use client"

/**
 * Shared WYSIWYG rich-text editor for the Onboarding module.
 *
 * Used by:
 *   - DocumentsSection  (Document Library template editor)
 *   - EmailsSection     (Email Templates editor)
 *
 * Exposes:
 *   - <RichTextEditor>            A single-section contentEditable editor with
 *                                 a full formatting toolbar (bold, italic,
 *                                 underline, headings, lists, alignment, link,
 *                                 color, highlight, code, source toggle, etc.).
 *   - <SectionedRichEditor>       Wraps three RichTextEditor instances behind
 *                                 Header / Body / Footer tabs. Exposes an
 *                                 imperative `insertSlug(slug)` API via ref so
 *                                 the parent can insert {{Variable}} tokens at
 *                                 the cursor of whichever section was last
 *                                 focused.
 *   - extractVariables(html)      Utility used by both sections to detect which
 *                                  {{slugs}} appear in the template.
 *
 * No external rich-text dependency is used. The editor is built on the native
 * contentEditable + document.execCommand APIs which are still fully supported
 * by every modern browser for the operations we need. This keeps the bundle
 * tiny and gives us complete control over the emitted HTML (which is what the
 * backend stores).
 */

import * as React from "react"
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow, Quote, Code2,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link2, Minus, Image as ImageIcon,
  Highlighter, Baseline,
  Undo2, Redo2, RemoveFormatting, ChevronDown, Eye, Code, Maximize2, Minimize2,
  Type as TypeIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// =====================================================================
// Types
// =====================================================================

export type EditorSection = "header" | "body" | "footer"

export interface RichEditorHandle {
  /** Insert a {{slug}} token at the cursor of the currently-focused section. */
  insertSlug: (slug: string) => void
  /** Focus a specific section. */
  focus: (section?: EditorSection) => void
}

export interface SectionedRichEditorProps {
  /** HTML content for the header section. */
  header: string
  /** HTML content for the body section (required). */
  body: string
  /** HTML content for the footer section. */
  footer: string
  /** Called whenever any section's HTML changes. */
  onChange: (section: EditorSection, html: string) => void
  /** Initial section to show. Defaults to "body". */
  initialSection?: EditorSection
  /** Min height (px) for the editing surface. Default 260. */
  minHeight?: number
  /** Compact mode (smaller toolbar, used in tight dialogs). */
  compact?: boolean
  /** Optional className for the outer wrapper. */
  className?: string
  /** Placeholders per section. */
  placeholders?: Partial<Record<EditorSection, string>>
}

// =====================================================================
// Utilities
// =====================================================================

/** Extract all unique {{slug}} tokens from an HTML string. */
export function extractVariables(html: string): string[] {
  if (!html) return []
  const set = new Set<string>()
  const re = /\{\{(\w+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) set.add(m[1])
  return Array.from(set)
}

// =====================================================================
// Toolbar button (top-level so it doesn't trigger the
// react-hooks/static-components rule)
// =====================================================================

interface ToolbarBtnProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  compact?: boolean
}

function ToolbarBtn({ icon: Icon, label, onClick, active, disabled, compact }: ToolbarBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault() }} // keep editor focused
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "grid place-items-center rounded-md transition-colors",
            compact ? "h-7 w-7" : "h-8 w-8",
            "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
            active && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
          )}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

// =====================================================================
// Single-section WYSIWYG editor (contentEditable)
// =====================================================================

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onFocus?: () => void
  placeholder?: string
  minHeight?: number
  compact?: boolean
  /** Receives an "insert" function the parent can call to inject slugs. */
  registerInsert?: (fn: (text: string) => void) => void
}

function RichTextEditor({
  value, onChange, onFocus, placeholder, minHeight = 260, compact, registerInsert,
}: RichTextEditorProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const savedRange = React.useRef<Range | null>(null)
  const isMounted = React.useRef(false)

  // ---- Source (HTML) mode toggle ----
  // Declared early so the value-sync effect below can depend on it.
  const [sourceMode, setSourceMode] = React.useState(false)

  // ---- External value sync ----
  // Only overwrite innerHTML when the incoming value differs from what's
  // already in the DOM. This prevents the caret from jumping to the start
  // every time the parent re-renders.
  //
  // When we toggle from Source view back to WYSIWYG view, the
  // contentEditable <div> is freshly mounted (it was unmounted while the
  // <textarea> was shown). We need to re-initialize its innerHTML from
  // the current `value` prop, so reset the mount flag whenever we enter
  // source mode — the next WYSIWYG render will then take the "first
  // mount" path below.
  React.useEffect(() => {
    if (sourceMode) {
      isMounted.current = false
    }
  }, [sourceMode])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!isMounted.current) {
      el.innerHTML = value || ""
      isMounted.current = true
      return
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value || ""
    }
  }, [value, sourceMode])

  // ---- Selection persistence ----
  const saveSelection = React.useCallback(() => {
    const sel = typeof window !== "undefined" ? window.getSelection() : null
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (ref.current && ref.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange()
      }
    }
  }, [])

  const restoreSelection = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = typeof window !== "undefined" ? window.getSelection() : null
    if (!sel) return
    if (savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    } else {
      // Move caret to end
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [])

  // ---- Command execution ----
  const exec = React.useCallback((command: string, val?: string) => {
    restoreSelection()
    try {
      document.execCommand(command, false, val)
    } catch {
      /* ignore — some commands are browser-specific */
    }
    if (ref.current) onChange(ref.current.innerHTML)
    saveSelection()
  }, [onChange, restoreSelection, saveSelection])

  // ---- Slug insertion ----
  const insertText = React.useCallback((text: string) => {
    restoreSelection()
    // Prefer insertText (preserves undo stack); fall back to insertHTML for
    // browsers that don't support insertText at the caret.
    let ok = false
    try {
      ok = document.execCommand("insertText", false, text)
    } catch {
      ok = false
    }
    if (!ok && ref.current) {
      // Fallback: manual range insertion
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
    if (ref.current) onChange(ref.current.innerHTML)
    saveSelection()
  }, [onChange, restoreSelection, saveSelection])

  // Register the insert function with the parent so it can call us when a
  // variable chip is clicked.
  React.useEffect(() => {
    if (registerInsert) registerInsert(insertText)
  }, [registerInsert, insertText])

  // ---- Event handlers ----
  const handleInput = React.useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML)
  }, [onChange])

  const handleBlur = React.useCallback(() => {
    saveSelection()
  }, [saveSelection])

  const handleMouseUp = React.useCallback(() => {
    saveSelection()
  }, [saveSelection])

  const handleKeyUp = React.useCallback(() => {
    saveSelection()
  }, [saveSelection])

  // ---- Toolbar buttons ----
  // (ToolbarBtn is a top-level component — see below — to satisfy the
  //  react-hooks/static-components rule.)

  // (sourceMode is declared at the top of the component so the value-sync
  //  effect can depend on it. Fullscreen state lives here.)
  const [fullscreen, setFullscreen] = React.useState(false)

  // ---- Block format dropdown ----
  const blockFormats: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "Paragraph",      value: "P",          icon: Pilcrow },
    { label: "Heading 1",      value: "H1",         icon: Heading1 },
    { label: "Heading 2",      value: "H2",         icon: Heading2 },
    { label: "Heading 3",      value: "H3",         icon: Heading3 },
    { label: "Blockquote",     value: "BLOCKQUOTE", icon: Quote },
    { label: "Code block",     value: "PRE",        icon: Code2 },
  ]
  const [activeBlock, setActiveBlock] = React.useState("P")

  const updateActiveBlock = React.useCallback(() => {
    try {
      const bq = document.queryCommandValue("formatBlock") as string
      if (typeof bq === "string" && bq) {
        const upper = bq.replace(/[<>]/g, "").toUpperCase()
        if (["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE"].includes(upper)) {
          setActiveBlock(upper)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // ---- Color pickers ----
  const textColors = [
    "#0f172a", "#475569", "#dc2626", "#ea580c", "#d97706",
    "#16a34a", "#0d9488", "#0891b2", "#7c3aed", "#db2777",
    "#ffffff",
  ]
  const [showTextColor, setShowTextColor] = React.useState(false)
  const [showHighlight, setShowHighlight] = React.useState(false)

  // ---- Link insertion ----
  const [linkUrl, setLinkUrl] = React.useState("")
  const [linkOpen, setLinkOpen] = React.useState(false)

  const applyLink = React.useCallback(() => {
    if (!linkUrl.trim()) return
    exec("createLink", linkUrl.trim())
    setLinkOpen(false)
    setLinkUrl("")
  }, [exec, linkUrl])

  // ---- Image insertion ----
  const [imgUrl, setImgUrl] = React.useState("")
  const [imgOpen, setImgOpen] = React.useState(false)
  const applyImage = React.useCallback(() => {
    if (!imgUrl.trim()) return
    exec("insertImage", imgUrl.trim())
    setImgOpen(false)
    setImgUrl("")
  }, [exec, imgUrl])

  return (
    <div className={cn(
      "flex flex-col h-full min-h-0 rounded-lg border border-border/60 bg-background overflow-hidden",
      fullscreen && "fixed inset-4 z-[100] rounded-xl shadow-2xl",
    )}>
      <TooltipProvider delayDuration={300}>
      {/* ----------------- Toolbar ----------------- */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-border/60 bg-muted/30">
        <ToolbarBtn compact={compact} icon={Undo2}  label="Undo"  onClick={() => exec("undo")} />
        <ToolbarBtn compact={compact} icon={Redo2}  label="Redo"  onClick={() => exec("redo")} />

        <Sep />

        {/* Block format dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 text-xs font-medium border border-transparent",
                compact ? "h-7" : "h-8",
                "text-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
              )}
            >
              {blockFormats.find((b) => b.value === activeBlock)?.label ?? "Paragraph"}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {blockFormats.map((b) => {
              const I = b.icon
              return (
                <DropdownMenuItem
                  key={b.value}
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => { exec("formatBlock", b.value); setActiveBlock(b.value) }}
                  className="gap-2 cursor-pointer"
                >
                  <I className="h-3.5 w-3.5" /> {b.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Sep />

        {/* Inline formatting */}
        <ToolbarBtn compact={compact} icon={Bold}          label="Bold (Ctrl+B)"          onClick={() => exec("bold")} />
        <ToolbarBtn compact={compact} icon={Italic}        label="Italic (Ctrl+I)"        onClick={() => exec("italic")} />
        <ToolbarBtn compact={compact} icon={Underline}     label="Underline (Ctrl+U)"     onClick={() => exec("underline")} />
        <ToolbarBtn compact={compact} icon={Strikethrough} label="Strikethrough"          onClick={() => exec("strikeThrough")} />

        <Sep />

        {/* Lists */}
        <ToolbarBtn compact={compact} icon={List}         label="Bullet list"  onClick={() => exec("insertUnorderedList")} />
        <ToolbarBtn compact={compact} icon={ListOrdered}  label="Numbered list" onClick={() => exec("insertOrderedList")} />

        <Sep />

        {/* Alignment */}
        <ToolbarBtn compact={compact} icon={AlignLeft}    label="Align left"    onClick={() => exec("justifyLeft")} />
        <ToolbarBtn compact={compact} icon={AlignCenter}  label="Align center"  onClick={() => exec("justifyCenter")} />
        <ToolbarBtn compact={compact} icon={AlignRight}   label="Align right"   onClick={() => exec("justifyRight")} />
        <ToolbarBtn compact={compact} icon={AlignJustify} label="Justify"       onClick={() => exec("justifyFull")} />

        <Sep />

        {/* Color */}
        <div className="relative">
          <ToolbarBtn
            compact={compact}
            icon={Baseline}
            label="Text color"
            onClick={() => { setShowHighlight(false); setShowTextColor((v) => !v) }}
          />
          {showTextColor && (
            <div className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg border border-border bg-background shadow-lg grid grid-cols-6 gap-1">
              {textColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec("foreColor", c); setShowTextColor(false) }}
                  className="h-5 w-5 rounded-md border border-border/60"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <ToolbarBtn
            compact={compact}
            icon={Highlighter}
            label="Highlight"
            onClick={() => { setShowTextColor(false); setShowHighlight((v) => !v) }}
          />
          {showHighlight && (
            <div className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg border border-border bg-background shadow-lg grid grid-cols-6 gap-1">
              {textColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec("hiliteColor", c); setShowHighlight(false) }}
                  className="h-5 w-5 rounded-md border border-border/60"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Insert */}
        <ToolbarBtn
          compact={compact}
          icon={Link2}
          label="Insert link"
          onClick={() => { restoreSelection(); setLinkOpen((v) => !v); setImgOpen(false) }}
        />
        <ToolbarBtn
          compact={compact}
          icon={ImageIcon}
          label="Insert image"
          onClick={() => { restoreSelection(); setImgOpen((v) => !v); setLinkOpen(false) }}
        />
        <ToolbarBtn compact={compact} icon={Minus} label="Horizontal rule" onClick={() => exec("insertHorizontalRule")} />

        <Sep />

        <ToolbarBtn compact={compact} icon={RemoveFormatting} label="Clear formatting" onClick={() => exec("removeFormat")} />

        {/* Right-aligned tools */}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarBtn
            compact={compact}
            icon={sourceMode ? Eye : Code}
            label={sourceMode ? "WYSIWYG view" : "HTML source view"}
            active={sourceMode}
            onClick={() => setSourceMode((v) => !v)}
          />
          <ToolbarBtn
            compact={compact}
            icon={fullscreen ? Minimize2 : Maximize2}
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => setFullscreen((v) => !v)}
          />
        </div>
      </div>

      {/* ----------------- Inline link/image inputs ----------------- */}
      {(linkOpen || imgOpen) && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-emerald-500/5">
          {linkOpen && (
            <>
              <Link2 className="h-3.5 w-3.5 text-emerald-600" />
              <Input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink() } }}
                placeholder="https://example.com"
                className="h-7 text-xs flex-1 max-w-xs"
              />
              <Button type="button" size="sm" className="h-7 text-xs" onClick={applyLink}>Insert</Button>
            </>
          )}
          {imgOpen && (
            <>
              <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
              <Input
                autoFocus
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyImage() } }}
                placeholder="https://example.com/logo.png"
                className="h-7 text-xs flex-1 max-w-xs"
              />
              <Button type="button" size="sm" className="h-7 text-xs" onClick={applyImage}>Insert</Button>
            </>
          )}
          <button
            type="button"
            onClick={() => { setLinkOpen(false); setImgOpen(false) }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2"
          >
            Close
          </button>
        </div>
      )}

      {/* ----------------- Editing surface ----------------- */}
      {sourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full p-4 font-mono text-xs leading-relaxed bg-background resize-none outline-none"
          style={{ minHeight }}
          placeholder="<p>Raw HTML…</p>"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onMouseUp={() => { handleMouseUp(); updateActiveBlock() }}
          onKeyUp={() => { handleKeyUp(); updateActiveBlock() }}
          onFocus={onFocus}
          spellCheck
          data-placeholder={placeholder}
          className={cn(
            "flex-1 w-full p-4 prose prose-sm max-w-none overflow-y-auto outline-none",
            "focus:outline-none",
            // Style editable content
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2",
            "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2",
            "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
            "[&_p]:my-1.5 [&_p]:leading-relaxed",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-emerald-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
            "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:text-xs [&_pre]:font-mono [&_pre]:overflow-x-auto",
            "[&_a]:text-emerald-600 [&_a]:underline dark:[&_a]:text-emerald-400",
            "[&_img]:max-w-full [&_img]:h-auto",
            "[&_hr]:my-3 [&_hr]:border-border/60",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:italic",
          )}
          style={{ minHeight }}
        />
      )}

      {/* ----------------- Footer status bar ----------------- */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/60 bg-muted/20 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <TypeIcon className="h-3 w-3" />
          {sourceMode ? "HTML source" : "WYSIWYG editor"}
        </span>
        <span>
          {sourceMode
            ? "Edits update the raw HTML"
            : "Tip: click a {{slug}} on the right to insert at the cursor"}
        </span>
      </div>
      </TooltipProvider>
    </div>
  )
}

function Sep() {
  return <Separator orientation="vertical" className="h-5 mx-1 bg-border/60" />
}

// =====================================================================
// Sectioned editor (Header / Body / Footer tabs)
// =====================================================================

/**
 * Three-tab WYSIWYG editor for Header / Body / Footer HTML content.
 * Exposes an imperative `insertSlug(slug)` API so the parent can route
 * {{variable}} clicks into whichever section was last focused.
 */
export const SectionedRichEditor = React.forwardRef<RichEditorHandle, SectionedRichEditorProps>(
  function SectionedRichEditor(props, ref) {
    const {
      header, body, footer, onChange, initialSection = "body",
      minHeight = 260, compact, className, placeholders,
    } = props

    const [active, setActive] = React.useState<EditorSection>(initialSection)
    const insertFns = React.useRef<Record<EditorSection, ((text: string) => void) | null>>({
      header: null, body: null, footer: null,
    })
    const lastFocused = React.useRef<EditorSection>(initialSection)

    React.useImperativeHandle(ref, () => ({
      insertSlug: (slug: string) => {
        const token = `{{${slug}}}`
        const section = lastFocused.current || active
        const fn = insertFns.current[section]
        if (fn) {
          fn(token)
        } else {
          // Fallback: append to the active section's HTML
          const current = section === "header" ? header : section === "footer" ? footer : body
          onChange(section, current + token)
        }
      },
      focus: (section) => {
        if (section) {
          setActive(section)
          lastFocused.current = section
        }
      },
    }), [active, body, footer, header, onChange])

    const tabs: { id: EditorSection; label: string; required?: boolean; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: "header", label: "Header", icon: PanelTopIcon },
      { id: "body",   label: "Body",   required: true, icon: PanelBodyIcon },
      { id: "footer", label: "Footer", icon: PanelBottomIcon },
    ]

    const current = active === "header" ? header : active === "body" ? body : footer
    const currentPlaceholder =
      active === "header"
        ? placeholders?.header ?? "<p style='text-align:center'><img src='{{CompanyLogo}}' alt='logo' height='40' /></p>"
        : active === "footer"
          ? placeholders?.footer ?? "<p style='color:#888; font-size:12px;'>© {{CompanyName}}. All rights reserved.</p>"
          : placeholders?.body ?? "<p>Hi {{CandidateName}},</p><p>Welcome to {{CompanyName}}! …</p>"

    return (
      <div className={cn("flex flex-col h-full min-h-0 gap-2", className)}>
        {/* Section tabs */}
        <div className="flex items-center gap-1.5">
          {tabs.map((t) => {
            const I = t.icon
            const isActive = active === t.id
            const hasContent = (t.id === "header" ? header : t.id === "footer" ? footer : body).trim().length > 0
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setActive(t.id); lastFocused.current = t.id }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-background text-muted-foreground hover:bg-muted/60 border-border/60",
                )}
              >
                <I className="h-3.5 w-3.5" />
                {t.label}
                {t.required && <span className="text-rose-500">*</span>}
                {hasContent && (
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )} />
                )}
              </button>
            )
          })}
          <span className="ml-auto text-[10px] text-muted-foreground/70 uppercase tracking-wide">
            WYSIWYG · HTML stored
          </span>
        </div>

        {/* Active editor */}
        <div className="flex-1 min-h-0">
          <RichTextEditor
            key={active}
            value={current}
            onChange={(html) => onChange(active, html)}
            onFocus={() => { lastFocused.current = active }}
            placeholder={currentPlaceholder}
            minHeight={minHeight}
            compact={compact}
            registerInsert={(fn) => { insertFns.current[active] = fn }}
          />
        </div>

        {/* Helper text */}
        <p className="text-[10px] text-muted-foreground/70 px-1">
          {active === "body" && "The body is the main content. Required."}
          {active === "header" && "Header appears at the top of every page (e.g. logo, letterhead)."}
          {active === "footer" && "Footer appears at the bottom of every page (e.g. page numbers, signatures)."}
        </p>
      </div>
    )
  },
)

// Tiny inline panel icons (avoid extra lucide imports)
function PanelTopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  )
}
function PanelBodyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="17" y2="13" />
      <line x1="7" y1="17" x2="13" y2="17" />
    </svg>
  )
}
function PanelBottomIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  )
}

// =====================================================================
// Tooltip provider wrapper (so consumers don't need to add one)
// =====================================================================
export function RichEditorTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
}
