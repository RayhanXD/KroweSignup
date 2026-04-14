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
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>

            <div className="animate-fade-slide-in step-delay-2 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                How will you
                <br />
                <span className="text-primary">monetize?</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed">
                Select all pricing models that apply to your product. You can combine multiple strategies.
              </p>
            </div>

            <div className="animate-fade-slide-in step-delay-4 bg-surface-subtle rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Tip
                </span>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">
                Many successful products combine{' '}
                <span className="text-primary">freemium</span> with a{' '}
                <span className="text-primary">subscription</span> upgrade path.
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
                    <div className="h-full bg-card rounded-xl border border-border p-4 flex flex-col gap-2 text-center transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 peer-checked:border-primary/50 peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-primary-soft">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary peer-checked:text-primary">
                        {option.label}
                      </h3>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            {showPriceInput && (
              <div className="animate-fade-slide-in">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Estimated price (optional)
                </label>
                <input
                  type="text"
                  value={value.estimatedPrice ?? ''}
                  onChange={(e) => onChange({ ...value, estimatedPrice: e.target.value || null })}
                  placeholder="e.g. $29/month or $199 one-time"
                  className="w-full px-4 py-2 text-foreground placeholder:text-muted-foreground bg-card border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            )}

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
                  disabled={!canContinue || submitting}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
