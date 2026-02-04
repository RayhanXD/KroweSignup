'use client'

import { Sparkles } from 'lucide-react'

export type FixNeededCardProps = {
  issues: { code: string; message: string; severity?: string }[]
  aiSuggestion: string | null
  aiReason: string | null
  canContinueAnyway: boolean
  saving: boolean
  finishing: boolean
  onUseSuggestion: () => void | Promise<void>
  onEditSuggestion: () => void
  onSaveMyEdit: () => void | Promise<void>
  onContinueAnyway: () => void | Promise<void>
}

export default function FixNeededCard({
  issues,
  aiSuggestion,
  aiReason,
  canContinueAnyway,
  saving,
  finishing,
  onUseSuggestion,
  onEditSuggestion,
  onSaveMyEdit,
  onContinueAnyway,
}: FixNeededCardProps) {
  const problemText = aiReason ?? (issues.length > 0 ? issues[0].message : null)

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-orange-100 shadow-md overflow-hidden transition-all duration-500">
      {/* Header row */}
      <div className="bg-orange-50/40 px-4 py-2 border-b border-orange-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" aria-hidden />
          <span className="text-[11px] font-bold text-orange-700 uppercase tracking-widest">Fix needed</span>
        </div>
        <span className="text-[10px] text-orange-400 font-medium bg-white px-1.5 py-0.5 rounded-full border border-orange-100">
          AI Suggestion
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Problem description */}
        {problemText && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {problemText}
          </p>
        )}

        {/* Suggested rewrite (inner recessed box) */}
        {aiSuggestion && (
          <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Suggested rewrite</h4>
            <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">
              {aiSuggestion}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {aiSuggestion && (
            <>
              <button
                type="button"
                disabled={saving || finishing}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                onClick={onUseSuggestion}
              >
                Use suggestion
              </button>
              <button
                type="button"
                disabled={saving || finishing}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold py-1.5 px-4 rounded-lg transition-all disabled:opacity-50"
                onClick={onEditSuggestion}
              >
                Edit suggestion
              </button>
              {canContinueAnyway && (
                <button
                  type="button"
                  onClick={onContinueAnyway}
                  disabled={saving}
                  className="text-[11px] underline text-gray-600 hover:text-gray-800 disabled:opacity-50 py-0 px-0"
                >
                  Keep my original anyway
                </button>
              )}
              <button
                type="button"
                disabled={saving || finishing}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold py-1.5 px-4 rounded-lg transition-all ml-auto disabled:opacity-50"
                onClick={onSaveMyEdit}
              >
                Save my edit
              </button>
            </>
          )}
          {!aiSuggestion && canContinueAnyway && (
            <button
              type="button"
              onClick={onContinueAnyway}
              disabled={saving}
              className="text-[11px] underline text-gray-600 hover:text-gray-800 disabled:opacity-50 py-0 px-0"
            >
              Keep my original anyway
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
