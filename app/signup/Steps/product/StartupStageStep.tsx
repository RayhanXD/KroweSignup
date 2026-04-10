'use client'

import { ArrowRight, Rocket } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

const STAGES = [
  {
    value: 'idea',
    label: 'Idea Stage',
    description: 'You have an idea but haven\'t validated it yet.',
  },
  {
    value: 'validation',
    label: 'Validation',
    description: 'Actively testing assumptions with potential users.',
  },
  {
    value: 'pre-mvp',
    label: 'Pre-MVP',
    description: 'Building your first version of the product.',
  },
  {
    value: 'mvp',
    label: 'MVP Launched',
    description: 'You have a working product with some users.',
  },
  {
    value: 'early-traction',
    label: 'Early Traction',
    description: 'Growing user base, first revenue or strong engagement.',
  },
  {
    value: 'growth',
    label: 'Growth',
    description: 'Scaling operations and expanding your market.',
  },
] as const

type StartupStage = (typeof STAGES)[number]['value']

type StartupStageStepProps = {
  value: StartupStage | null
  onChange: (v: StartupStage) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

export default function StartupStageStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 100,
}: StartupStageStepProps) {
  const { submitting } = useSignupForm()
  const canContinue = value !== null

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-[#fff4e6] flex items-center justify-center">
              <Rocket className="w-6 h-6 text-[#f97316]" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Where are you
                <br />
                <span className="text-[#f97316]">right now?</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                Select the stage that best describes your startup today. This helps us tailor your plan.
              </p>
            </div>

            <div className="animate-fade-slide-in step-delay-4 bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Almost there
                </span>
              </div>
              <p className="text-sm text-black leading-relaxed">
                This is the <span className="text-[#f97316]">final step</span> before we generate your personalized startup plan.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="animate-fade-slide-in step-delay-5 space-y-2">
              {STAGES.map((stage, idx) => (
                <label key={stage.value} className="group cursor-pointer block">
                  <input
                    type="radio"
                    className="peer sr-only"
                    name="startup_stage"
                    value={stage.value}
                    checked={value === stage.value}
                    onChange={() => onChange(stage.value)}
                  />
                  <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 transition-all duration-200 hover:border-orange-200 hover:shadow-sm peer-checked:border-orange-400 peer-checked:ring-1 peer-checked:ring-orange-400 peer-checked:bg-orange-50">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 peer-checked:bg-orange-100 flex items-center justify-center text-xs font-bold text-gray-500 peer-checked:text-orange-600 transition-colors">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-700 peer-checked:text-orange-700">
                        {stage.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                </label>
              ))}
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
                  Analyze my interviews
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
