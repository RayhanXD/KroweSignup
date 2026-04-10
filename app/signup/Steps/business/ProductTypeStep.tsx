'use client'

import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type ProductType = 'mobile' | 'web' | 'both' | 'other'

type ProductTypeStepProps = {
  value: ProductType | null;
  onChange: (v: ProductType) => void;
  onBack?: () => void;
  onContinue: () => void;
  progressPercent?: number //optional if I want to add a progress bar
}

export default function ProductTypeStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 33,
}: ProductTypeStepProps) {
  const { submitting } = useSignupForm()

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="flex-grow flex items-center justify-center p-6 md:p-12 relative overflow-hidden w-full">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <div className="text-center mb-12 space-y-4 max-w-2xl">
            <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mb-2 border border-orange-100/50 shadow-sm">
              <span className="material-symbols-outlined">category</span>
            </div>
            <h1 className="animate-fade-slide-in step-delay-2 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              What type of <span className="text-orange-500">product</span> is your idea?
            </h1>
            <p className="animate-fade-slide-in step-delay-3 text-lg text-gray-500 leading-relaxed">
              Categorizing your solution helps us tailor the incubation roadmap specifically for your technology stack.
            </p>
          </div>
          <div className="animate-fade-slide-in step-delay-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-12">
            <label className="group cursor-pointer relative">
              <input
                className="peer sr-only"
                name="product_type"
                type="radio"
                value="mobile"
                checked={value === 'mobile'}
                onChange={() => onChange('mobile')}
              />
              <div className="h-full bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-orange-200 hover:-translate-y-1 peer-checked:border-orange-400 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-orange-400 peer-checked:bg-orange-50">
                <div className="w-16 h-16 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 peer-checked:bg-white peer-checked:text-orange-500 peer-checked:border peer-checked:border-orange-200 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">smartphone</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 peer-checked:text-orange-700">Mobile App</h3>
                  <p className="text-xs text-gray-500 font-medium">iOS & Android</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-orange-500">
                  <span className="material-symbols-outlined filled">check_circle</span>
                </div>
              </div>
            </label>
            <label className="group cursor-pointer relative">
              <input
                className="peer sr-only"
                name="product_type"
                type="radio"
                value="web"
                checked={value === 'web'}
                onChange={() => onChange('web')}
              />
              <div className="h-full bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-orange-200 hover:-translate-y-1 peer-checked:border-orange-400 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-orange-400 peer-checked:bg-orange-50">
                <div className="w-16 h-16 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 peer-checked:bg-white peer-checked:text-orange-500 peer-checked:border peer-checked:border-orange-200 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">laptop_mac</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 peer-checked:text-orange-700">Web App</h3>
                  <p className="text-xs text-gray-500 font-medium">Browser Based</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-orange-500">
                  <span className="material-symbols-outlined filled">check_circle</span>
                </div>
              </div>
            </label>
            <label className="group cursor-pointer relative">
              <input
                className="peer sr-only"
                name="product_type"
                type="radio"
                value="both"
                checked={value === 'both'}
                onChange={() => onChange('both')}
              />
              <div className="h-full bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-orange-200 hover:-translate-y-1 peer-checked:border-orange-400 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-orange-400 peer-checked:bg-orange-50">
                <div className="w-16 h-16 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 peer-checked:bg-white peer-checked:text-orange-500 peer-checked:border peer-checked:border-orange-200 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">devices</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 peer-checked:text-orange-700">Both</h3>
                  <p className="text-xs text-gray-500 font-medium">Cross-platform</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-orange-500">
                  <span className="material-symbols-outlined filled">check_circle</span>
                </div>
              </div>
            </label>
            <label className="group cursor-pointer relative">
              <input
                className="peer sr-only"
                name="product_type"
                type="radio"
                value="other"
                checked={value === 'other'}
                onChange={() => onChange('other')}
              />
              <div className="h-full bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-orange-200 hover:-translate-y-1 peer-checked:border-orange-400 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-orange-400 peer-checked:bg-orange-50">
                <div className="w-16 h-16 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 peer-checked:bg-white peer-checked:text-orange-500 peer-checked:border peer-checked:border-orange-200 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">more_horiz</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 peer-checked:text-orange-700">Other</h3>
                  <p className="text-xs text-gray-500 font-medium">Hardware / Service</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-orange-500">
                  <span className="material-symbols-outlined filled">check_circle</span>
                </div>
              </div>
            </label>
          </div>
          <div className="animate-fade-slide-in step-delay-6 flex items-center justify-end gap-5 w-full max-w-5xl border-t border-gray-100 pt-8">
            <button
              type="button"
              onClick={onBack}
              className="text-gray-500 hover:text-gray-900 text-sm font-medium px-4 py-2 transition-colors focus:outline-none flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Go Back
            </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={!value || submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </SignupStepLayout>
  )
}
