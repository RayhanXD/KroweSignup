'use client'

import { ArrowRight, MessageSquare } from 'lucide-react'
import { useRef } from 'react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

const MAX = 100

type InterviewCountStepProps = {
  value: number
  onChange: (v: number) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

function getFeedbackText(count: number): string {
  if (count === 0) return 'No problem — you can still get great insights without interviews.'
  if (count <= 4) return 'A solid start. Even a few interviews can surface key patterns.'
  if (count <= 9) return 'Great foundation. This many interviews will reveal strong themes.'
  if (count < MAX) return 'Impressive research. You\'ll have very high-confidence insights.'
  return 'World-class research. You\'re building on an exceptional foundation.'
}

export default function InterviewCountStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 83,
}: InterviewCountStepProps) {
  const { submitting } = useSignupForm()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(Number(e.target.value))
  }

  function handleTextInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw === '') {
      onChange(0)
      return
    }
    const num = Math.min(Number(raw), MAX)
    onChange(num)
  }

  const displayValue = value >= MAX ? `${MAX}+` : String(value)
  const sliderPercent = (value / MAX) * 100

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Customer interviews
                <br />
                <span className="text-primary">conducted</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                How many customer or user interviews have you done so far? Zero is perfectly fine.
              </p>
            </div>

            <div className="animate-fade-slide-in step-delay-4 bg-surface-subtle rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Why it matters
                </span>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">
                Interviews help validate your{' '}
                <span className="text-primary">assumptions</span> before you invest in building.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="animate-fade-slide-in step-delay-5 bg-card rounded-2xl border border-border shadow-sm p-8 flex flex-col items-center gap-6">
              {/* Number display / text input */}
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={value === 0 ? '' : String(value)}
                onChange={handleTextInput}
                placeholder="0"
                className="text-6xl font-bold text-foreground w-28 text-center tabular-nums bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/70"
              />
              {value >= MAX && (
                <span className="text-sm font-semibold text-primary -mt-4">100+</span>
              )}

              {/* Slider */}
              <div className="w-full px-1">
                <style>{`
                  .interview-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 6px;
                    border-radius: 9999px;
                    background: linear-gradient(
                      to right,
                      var(--primary) 0%,
                      var(--primary) ${sliderPercent}%,
                      var(--track) ${sliderPercent}%,
                      var(--track) 100%
                    );
                    outline: none;
                    cursor: pointer;
                  }
                  .interview-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: var(--primary);
                    border: 3px solid white;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                    cursor: grab;
                  }
                  .interview-slider::-moz-range-thumb {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: var(--primary);
                    border: 3px solid white;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                    cursor: grab;
                  }
                `}</style>
                <input
                  type="range"
                  min={0}
                  max={MAX}
                  value={value}
                  onChange={handleSlider}
                  className="interview-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>100+</span>
                </div>
              </div>

              <p className="text-sm text-center text-muted-foreground max-w-xs">
                {getFeedbackText(value)}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="animate-fade-slide-in step-delay-6 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success" />
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
                  className="flex items-center gap-2 bg-primary-soft hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
