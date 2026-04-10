'use client'

import { ArrowRight, DollarSign } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

const PRICING_OPTIONS = [
  { value: 'free', label: 'Free', description: 'No cost to users' },
  { value: 'freemium', label: 'Freemium', description: 'Free tier + paid upgrades' },
  { value: 'subscription', label: 'Subscription', description: 'Recurring monthly/annual fee' },
  { value: 'one_time', label: 'One-time Purchase', description: 'Single payment for access' },
  { value: 'usage_based', label: 'Usage-based', description: 'Pay per use or consumption' },
  { value: 'marketplace', label: 'Marketplace', description: 'Commission on transactions' },
  { value: 'enterprise', label: 'Enterprise', description: 'Custom pricing for orgs' },
] as const

type PricingModel = (typeof PRICING_OPTIONS)[number]['value']

const PRICE_INPUT_MODELS: PricingModel[] = ['one_time', 'subscription', 'usage_based', 'marketplace']

export type PricingModelValue = {
  pricingModels: string[]
  estimatedPrice: string | null
}

type PricingModelStepProps = {
  value: PricingModelValue
  onChange: (v: PricingModelValue) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

export default function PricingModelStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 75,
}: PricingModelStepProps) {
  const { submitting } = useSignupForm()
  const canContinue = value.pricingModels.length > 0

  const showPriceInput = value.pricingModels.some((m) =>
    PRICE_INPUT_MODELS.includes(m as PricingModel)
  )

  function toggleModel(model: string) {
    const next = value.pricingModels.includes(model)
      ? value.pricingModels.filter((m) => m !== model)
      : [...value.pricingModels, model]
    onChange({ ...value, pricingModels: next })
  }

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-[#fff4e6] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#f97316]" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                How will you
                <br />
                <span className="text-[#f97316]">monetize?</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                Select all pricing models that apply to your product. You can combine multiple strategies.
              </p>
            </div>

            <div className="animate-fade-slide-in step-delay-4 bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Tip
                </span>
              </div>
              <p className="text-sm text-black leading-relaxed">
                Many successful products combine{' '}
                <span className="text-[#f97316]">freemium</span> with a{' '}
                <span className="text-[#f97316]">subscription</span> upgrade path.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="animate-fade-slide-in step-delay-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {PRICING_OPTIONS.map((option) => {
                const selected = value.pricingModels.includes(option.value)
                return (
                  <label key={option.value} className="group cursor-pointer relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selected}
                      onChange={() => toggleModel(option.value)}
                    />
                    <div className="h-full bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 text-center transition-all duration-200 hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 peer-checked:border-orange-400 peer-checked:ring-1 peer-checked:ring-orange-400 peer-checked:bg-orange-50">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 peer-checked:text-orange-700">
                        {option.label}
                      </h3>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            {showPriceInput && (
              <div className="animate-fade-slide-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated price (optional)
                </label>
                <input
                  type="text"
                  value={value.estimatedPrice ?? ''}
                  onChange={(e) => onChange({ ...value, estimatedPrice: e.target.value || null })}
                  placeholder="e.g. $29/month or $199 one-time"
                  className="w-full px-4 py-2 text-black placeholder:text-muted-foreground bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors"
                />
              </div>
            )}

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
