'use client'

import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

export type IndustryId =
  | 'edtech'
  | 'fintech'
  | 'health'
  | 'ecommerce'
  | 'saas'
  | 'marketplace'
  | 'creator'
  | 'other'

type IndustryStepProps = {
  value: IndustryId | null
  otherValue: string
  onChange: (v: IndustryId) => void
  onOtherChange: (v: string) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

interface IndustryOption {
  id: IndustryId
  name: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
}

const INDUSTRIES: IndustryOption[] = [
  {
    id: 'fintech',
    name: 'Fintech',
    description: 'Tech-powered financial services like payments, banking, lending, and investing.',
    icon: 'account_balance_wallet',
    iconBg: 'bg-[#FFF5EE]',
    iconColor: 'text-[#E05202]',
  },
  {
    id: 'health',
    name: 'Healthtech',
    description: 'Software and services designed to improve medical care and hospital management.',
    icon: 'cardiology',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Online marketplaces, direct-to-consumer brands, and retail technology.',
    icon: 'shopping_cart',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
  {
    id: 'saas',
    name: 'SaaS',
    description: 'Software licensed on a subscription basis, centrally hosted.',
    icon: 'cloud_queue',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    id: 'edtech',
    name: 'Edtech',
    description: 'Technology facilitating learning and improving performance.',
    icon: 'school',
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Platforms connecting buyers and sellers, two-sided marketplaces, and peer-to-peer services.',
    icon: 'store',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    id: 'creator',
    name: 'Creator Tools',
    description: 'Tools and platforms for content creators, influencers, and digital artists.',
    icon: 'palette',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-500',
  },
]

export default function IndustryStep({
  value,
  otherValue,
  onChange,
  onOtherChange,
  onBack,
  onContinue,
  progressPercent = 0,
}: IndustryStepProps) {
  const canContinue = !!value && (value !== 'other' || otherValue.trim().length >= 3)
  const { submitting } = useSignupForm()

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="flex-grow flex items-center justify-center p-4 md:p-8 relative overflow-hidden w-full">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left column */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-5 pt-2 lg:sticky lg:top-20">
            <div className="space-y-3">
              <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#FFF5EE] text-[#E05202] mb-1 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">factory</span>
              </div>
              <h1 className="animate-fade-slide-in step-delay-2 text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-[1.15]">
                What <span className="text-orange-500 bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">industry</span> does your idea fall under?
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-base text-gray-500 leading-relaxed">
                Based on your previous answers, we&apos;ve highlighted some sectors that seem like a good fit, or you can specify your own.
              </p>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 w-full">
            <div className="animate-fade-slide-in step-delay-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {INDUSTRIES.map((industry) => (
                <div key={industry.id} className="relative group">
                  <input
                    className="peer sr-only"
                    id={`ind_${industry.id}`}
                    name="industry"
                    type="radio"
                    value={industry.id}
                    checked={value === industry.id}
                    onChange={() => onChange(industry.id)}
                  />
                  <label
                    htmlFor={`ind_${industry.id}`}
                    className="block h-full cursor-pointer bg-white border border-gray-200 rounded-lg p-3.5 hover:border-primary-300 hover:shadow-md transition-all duration-200 relative peer-checked:border-primary-400 peer-checked:shadow-md peer-checked:ring-1 peer-checked:ring-primary-400 peer-checked:bg-orange-50/50 peer-checked:[&_.check-icon]:opacity-100 peer-checked:[&_.check-icon]:scale-100"
                  >
                    <div className="check-icon absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 scale-75 transition-all duration-200">
                      <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                    </div>
                    <div className={`w-8 h-8 rounded-md ${industry.iconBg} ${industry.iconColor} flex items-center justify-center mb-2.5`}>
                      <span className="material-symbols-outlined text-[18px]">{industry.icon}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-0.5">{industry.name}</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{industry.description}</p>
                  </label>
                </div>
              ))}

              {/* Other card with inline input */}
              <div className="relative group h-full">
                <input
                  className="peer sr-only"
                  id="ind_other"
                  name="industry"
                  type="radio"
                  value="other"
                  checked={value === 'other'}
                  onChange={() => onChange('other')}
                />
                <label
                  htmlFor="ind_other"
                  className="block h-full cursor-pointer bg-white border border-gray-200 rounded-lg p-3.5 hover:border-primary-300 hover:shadow-md transition-all duration-200 relative flex flex-col peer-checked:border-primary-400 peer-checked:shadow-md peer-checked:ring-1 peer-checked:ring-primary-400 peer-checked:bg-orange-50/50 peer-checked:[&_.check-icon]:opacity-100 peer-checked:[&_.check-icon]:scale-100"
                >
                  <div className="check-icon absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 scale-75 transition-all duration-200">
                    <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                  </div>
                  <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center mb-2.5">
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-0.5">Other</h3>
                  <p className="text-[11px] text-gray-500 mb-2">If none of these fit your idea select this and type your industry.</p>
                  <div className="mt-auto pt-1">
                    <input
                      type="text"
                      value={otherValue}
                      onChange={(e) => onOtherChange(e.target.value)}
                      onFocus={() => onChange('other')}
                      placeholder="Type specific industry..."
                      className="w-full text-xs text-gray-900 border-0 border-b border-gray-200 focus:border-[#E05202] focus:outline-none focus:ring-0 bg-transparent px-0 py-0.5 transition-colors placeholder:text-gray-400 caret-[#E05202] [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_white] [&:-webkit-autofill]:[-webkit-text-fill-color:#171717]"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="animate-fade-slide-in step-delay-6 mt-6 flex items-center justify-end gap-5 border-t border-gray-100 pt-4">
              {onBack != null && (
                <button
                  type="button"
                  onClick={onBack}
                  className="text-gray-500 hover:text-gray-900 text-xs font-medium px-3 py-1.5 transition-colors focus:outline-none rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
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
    </SignupStepLayout>
  )
}
