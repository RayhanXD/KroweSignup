'use client'

import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type HoursCommitmentStepProps = {
  value: number
  onChange: (v: number) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

export default function HoursCommitmentStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 100,
}: HoursCommitmentStepProps) {
  const hours = value
  const max = 168
  const { submitting } = useSignupForm()

  return (
    <>
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-5xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-soft/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center p-6 md:p-12">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-soft text-primary mb-2 border border-primary/20 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <h1 className="animate-fade-slide-in step-delay-2 text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15]">
                How many hours <br /> <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-primary-hover">can you put in weekly?</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-base text-muted-foreground leading-relaxed max-w-md -mt-2">
                keep this number realistic, you&apos;re only lying to yourself
              </p>
            </div>
            {/* Structure Hint Box */}
            <div className="animate-fade-slide-in step-delay-4 bg-surface-subtle rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Time Commitment
                </span>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">
                Understanding your available time helps us suggest <span className="text-primary">realistic milestones</span> and <span className="text-primary">compatible co-founder matches</span>.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 w-full">
            <div className="animate-fade-slide-in step-delay-5 bg-card rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-border/60 overflow-hidden relative group transition-all duration-500 hover:shadow-lg hover:ring-border/80">
              <div className="relative h-[320px] flex flex-col items-center justify-center pb-16">
                <div className="w-full max-w-sm px-6">
                  <div className="text-center mb-6">
                    <span className="block text-3xl md:text-4xl font-bold text-foreground mb-2" id="hours-display">
                      {hours} {hours === 1 ? 'hour' : 'hours'}
                    </span>
                  </div>
                  <div className="relative w-full">
                    <input
                      type="range"
                      id="hours-slider"
                      min={0}
                      max={max}
                      step={1}
                      value={hours}
                      onChange={(e) => onChange(Number(e.target.value))}
                      className="w-full h-2 bg-muted/80 rounded-lg appearance-none cursor-pointer accent-primary slider"
                      style={{
                        background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(hours / max) * 100}%, var(--track) ${(hours / max) * 100}%, var(--track) 100%)`,
                      }}
                    />
                    <div className="flex justify-between mt-4 text-sm font-medium text-muted-foreground">
                      <span>0</span>
                      <span>168</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="animate-fade-slide-in step-delay-6 bg-card/80 backdrop-blur-sm border-t border-border/50 p-4 md:px-6 md:py-4 flex items-center justify-between absolute bottom-0 w-full z-10">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-success/80 animate-pulse" />
                  Auto-saved
                </div>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-2 transition-colors focus:outline-none"
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
      </div>
    </SignupStepLayout>
    <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid var(--track);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid var(--track);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  )
}
