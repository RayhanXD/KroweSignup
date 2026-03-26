'use client'

export type FixNeededCardProps = {
  issues: { code: string; message: string; severity?: string }[]
  canContinueAnyway: boolean
  saving: boolean
  finishing: boolean
  onContinueAnyway: () => void | Promise<void>
}

export default function FixNeededCard({
  issues,
  canContinueAnyway,
  saving,
  finishing,
  onContinueAnyway,
}: FixNeededCardProps) {
  const problemText = issues.length > 0 ? issues[0].message : null

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-orange-100 shadow-md overflow-hidden transition-all duration-500">
      {/* Header row */}
      <div className="bg-orange-50/40 px-4 py-2 border-b border-orange-50 flex items-center">
        <span className="text-[11px] font-bold text-orange-700 uppercase tracking-widest">Fix needed</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Problem description */}
        {problemText && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {problemText}
          </p>
        )}

        {/* Action buttons */}
        {canContinueAnyway && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onContinueAnyway}
              disabled={saving || finishing}
              className="text-[11px] underline text-gray-600 hover:text-gray-800 disabled:opacity-50 py-0 px-0"
            >
              Keep my original anyway
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
