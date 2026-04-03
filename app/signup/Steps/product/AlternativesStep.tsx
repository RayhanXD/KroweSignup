'use client'

import { useState } from 'react'
import { ArrowRight, Shuffle } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type AlternativesStepProps = {
  value: string[]
  onChange: (v: string[]) => void
  onBack?: () => void
  onContinue: () => void
  onSkip: () => void
  progressPercent?: number
}

export default function AlternativesStep({
  value,
  onChange,
  onBack,
  onContinue,
  onSkip,
  progressPercent = 66,
}: AlternativesStepProps) {
  const [input, setInput] = useState('')
  const { submitting } = useSignupForm()

  function addChip() {
    const trimmed = input.trim()
    if (!trimmed) return
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  function removeChip(chip: string) {
    onChange(value.filter((c) => c !== chip))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addChip()
    }
  }

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-[#fff4e6] flex items-center justify-center">
              <Shuffle className="w-6 h-6 text-[#f97316]" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Current
                <br />
                <span className="text-[#f97316]">alternatives</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                What are people using today to solve this problem? Spreadsheets, manual processes, other tools?
              </p>
            </div>

            <div className="animate-fade-slide-in step-delay-4 bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Examples
                </span>
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">
                <span className="text-[#f97316]">Excel spreadsheets</span>,{' '}
                <span className="text-[#f97316]">Email threads</span>,{' '}
                <span className="text-[#f97316]">Pen and paper</span>
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="animate-fade-slide-in step-delay-5 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type an alternative and press Enter…"
                  className="flex-1 px-4 py-2 text-black placeholder:text-muted-foreground bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors"
                />
                <button
                  type="button"
                  onClick={addChip}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>

              {value.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-lg min-h-[80px]">
                  {value.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm font-medium"
                    >
                      {chip}
                      <button
                        type="button"
                        onClick={() => removeChip(chip)}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-200 transition-colors text-orange-500"
                        aria-label={`Remove ${chip}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="animate-fade-slide-in step-delay-6 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Auto-saved</span>
              </div>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </SignupStepLayout>
  )
}
