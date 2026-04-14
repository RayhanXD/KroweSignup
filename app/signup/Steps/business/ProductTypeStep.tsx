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
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-soft/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <div className="text-center mb-12 space-y-4 max-w-2xl">
            <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-soft text-primary mb-2 border border-primary/20 shadow-sm">
              <span className="material-symbols-outlined">category</span>
            </div>
            <h1 className="animate-fade-slide-in step-delay-2 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              What type of <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-primary-hover">product</span> is your idea?
            </h1>
            <p className="animate-fade-slide-in step-delay-3 text-lg text-muted-foreground leading-relaxed">
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
              <div className="h-full bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-1 peer-checked:border-primary/50 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-primary-soft">
                <div className="w-16 h-16 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary peer-checked:bg-card peer-checked:text-primary peer-checked:border peer-checked:border-primary/30 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">smartphone</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary peer-checked:text-primary">Mobile App</h3>
                  <p className="text-xs text-muted-foreground font-medium">iOS & Android</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-primary">
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
              <div className="h-full bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-1 peer-checked:border-primary/50 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-primary-soft">
                <div className="w-16 h-16 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary peer-checked:bg-card peer-checked:text-primary peer-checked:border peer-checked:border-primary/30 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">laptop_mac</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary peer-checked:text-primary">Web App</h3>
                  <p className="text-xs text-muted-foreground font-medium">Browser Based</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-primary">
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
              <div className="h-full bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-1 peer-checked:border-primary/50 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-primary-soft">
                <div className="w-16 h-16 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary peer-checked:bg-card peer-checked:text-primary peer-checked:border peer-checked:border-primary/30 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">devices</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary peer-checked:text-primary">Both</h3>
                  <p className="text-xs text-muted-foreground font-medium">Cross-platform</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-primary">
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
              <div className="h-full bg-card rounded-2xl border border-border p-8 flex flex-col items-center justify-center gap-6 text-center transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-1 peer-checked:border-primary/50 peer-checked:shadow-card-hover peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-primary-soft">
                <div className="w-16 h-16 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary peer-checked:bg-card peer-checked:text-primary peer-checked:border peer-checked:border-primary/30 flex items-center justify-center transition-colors duration-300">
                  <span className="material-symbols-outlined text-[32px]">more_horiz</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary peer-checked:text-primary">Other</h3>
                  <p className="text-xs text-muted-foreground font-medium">Hardware / Service</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity text-primary">
                  <span className="material-symbols-outlined filled">check_circle</span>
                </div>
              </div>
            </label>
          </div>
          <div className="animate-fade-slide-in step-delay-6 flex items-center justify-end gap-5 w-full max-w-5xl border-t border-border/60 pt-8">
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2 transition-colors focus:outline-none flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Go Back
            </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={!value || submitting}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
