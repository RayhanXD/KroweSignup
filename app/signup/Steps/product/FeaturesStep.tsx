'use client'

import { useState } from 'react'
import { ArrowRight, Layers } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type FeaturesStepProps = {
  value: string[]
  onChange: (v: string[]) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

export default function FeaturesStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 25,
}: FeaturesStepProps) {
  const [input, setInput] = useState('')
  const { submitting } = useSignupForm()
  const canContinue = value.length > 0

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
              <Layers className="w-6 h-6 text-[#f97316]" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Key features of
                <br />
                <span className="text-[#f97316]">your product</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                List the core capabilities your product will offer. Think about what makes it valuable to your users.
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
                <span className="text-[#f97316]">User authentication</span>,{' '}
                <span className="text-[#f97316]">Real-time notifications</span>,{' '}
                <span className="text-[#f97316]">Dashboard analytics</span>
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
                  placeholder="Type a feature and press Enter…"
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

              {value.length >= 10 && (
                <p className="text-xs text-muted-foreground">
                  Great list! You can keep adding or continue when ready.
                </p>
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
                  disabled={!canContinue || submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SignupStepLayout>
  )
}
