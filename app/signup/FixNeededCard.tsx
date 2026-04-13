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
    <div className="max-w-3xl mx-auto bg-card rounded-xl border border-primary/20 shadow-md overflow-hidden transition-all duration-500">
      {/* Header row */}
      <div className="bg-primary-soft px-4 py-2 border-b border-primary/20 flex items-center">
        <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Fix needed</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Problem description */}
        {problemText && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
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
              className="text-[11px] underline text-muted-foreground hover:text-foreground disabled:opacity-50 py-0 px-0"
            >
              Keep my original anyway
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
