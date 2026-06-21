'use client'

import * as React from "react"

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 className="text-base font-semibold text-rose-700 dark:text-rose-400">Something went wrong</h2>
            </div>
            <p className="text-sm text-rose-600 dark:text-rose-300/80 mb-3">A client-side error occurred while rendering this module.</p>
            <pre className="text-xs bg-rose-100/70 dark:bg-rose-500/10 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all text-rose-700 dark:text-rose-300 mb-4">
{this.state.error.message}
{this.state.error.stack?.split("\n").slice(0, 4).join("\n")}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Reload module
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
