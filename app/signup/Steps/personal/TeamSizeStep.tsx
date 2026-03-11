'use client'

import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type TeamSizeStepProps = {
  value: number
  onChange: (v: number) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

export default function TeamSizeStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 85
}: TeamSizeStepProps) {
  const teamSize = value
  const { submitting } = useSignupForm()

  const displayValue = teamSize === 30 ? '30+' : teamSize
  const displayText = teamSize === 30 ? 'person' : 'people'

  return (
    <>
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-5xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center p-6 md:p-12">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8 pt-4">
            <div className="space-y-4">
              <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-primary-600 mb-2 border border-orange-100/50 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
              <h1 className="animate-fade-slide-in step-delay-2 text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-[1.15]">
                How many people <br /> <span className="text-orange-500 bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">are on your team?</span>
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-base text-gray-500 leading-relaxed max-w-md -mt-2">
                it&apos;s okay to not have anyone yet
              </p>
            </div>
            {/* Structure Hint Box */}
            <div className="animate-fade-slide-in step-delay-4 bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Team Dynamics
                </span>
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">
                Understanding your <span className="text-[#f97316]">team size</span> helps us recommend suitable <span className="text-[#f97316]">collaboration tools</span> and <span className="text-[#f97316]">mentorship programs</span> tailored to your scale.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 w-full">
            <div className="animate-fade-slide-in step-delay-5 bg-white rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-gray-100 overflow-hidden relative group transition-all duration-500 hover:shadow-lg hover:ring-gray-200">
              <div className="relative h-[320px] flex flex-col items-center justify-center pb-16">
                <div className="w-full max-w-sm px-6">
                  <div className="text-center mb-6">
                    <span className="block text-3xl md:text-4xl font-bold text-gray-900 mb-2" id="team-size-display">
                      {displayValue} {displayText}
                    </span>
                  </div>
                  <div className="relative w-full">
                    <input
                      type="range"
                      id="team-slider"
                      min="0"
                      max="30"
                      step="1"
                      value={teamSize}
                      onChange={(e) => onChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider accent-primary-500"
                      style={{
                        background: `linear-gradient(to right, #f97316 0%, #f97316 ${(teamSize / 30) * 100}%, #e5e7eb ${(teamSize / 30) * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between mt-4 text-sm font-medium text-gray-400">
                      <span>0</span>
                      <span>30+</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="animate-fade-slide-in step-delay-6 bg-white/80 backdrop-blur-sm border-t border-gray-50 p-4 md:px-6 md:py-4 flex items-center justify-between absolute bottom-0 w-full z-10">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Auto-saved
                </div>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-900 text-sm font-medium px-2 py-2 transition-colors focus:outline-none"
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
          border: 2px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  )
}
