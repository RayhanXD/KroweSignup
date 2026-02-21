'use client'

import SignupStepLayout from '../SignupStepLayout'

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

  return (
    <>
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-5xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-fgradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center p-6 md:p-12">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-primary-600 mb-2 border border-orange-100/50 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-[1.15]">
                How many hours <br /> <span className="text-orange-500 bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">can you put in weekly?</span>
              </h1>
              <p className="text-base text-gray-500 leading-relaxed max-w-md -mt-2">
                keep this number realistic, you&apos;re only lying to yourself
              </p>
            </div>
            {/* Structure Hint Box */}
            <div className="bg-[#fafafa] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Time Commitment
                </span>
              </div>
              <p className="font-mono text-sm text-black leading-relaxed">
                Understanding your available time helps us suggest <span className="text-[#f97316]">realistic milestones</span> and <span className="text-[#f97316]">compatible co-founder matches</span>.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 w-full">
            <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-gray-100 overflow-hidden relative group transition-all duration-500 hover:shadow-lg hover:ring-gray-200">
              <div className="relative h-[320px] flex flex-col items-center justify-center pb-16">
                <div className="w-full max-w-sm px-6">
                  <div className="text-center mb-6">
                    <span className="block text-3xl md:text-4xl font-bold text-gray-900 mb-2" id="hours-display">
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
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500 slider"
                      style={{
                        background: `linear-gradient(to right, #f97316 0%, #f97316 ${(hours / max) * 100}%, #e5e7eb ${(hours / max) * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between mt-4 text-sm font-medium text-gray-400">
                      <span>0</span>
                      <span>168</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-t border-gray-50 p-4 md:px-6 md:py-4 flex items-center justify-between absolute bottom-0 w-full z-10">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Auto-saved
                </div>
                <div className="flex items-center gap-4">
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
                    className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 bg-gray-900 rounded-lg hover:bg-primary-600 hover:shadow-lg hover:shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Continue
                    <span className="material-symbols-outlined text-lg ml-2 transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
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
