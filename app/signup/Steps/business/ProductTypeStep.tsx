'use client'

import SignupStepLayout from '../SignupStepLayout'

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
  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-6xl mx-auto flex flex-col">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900">
            what type of product is your idea?
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-32">
          <button
            type="button"
            onClick={() => onChange('mobile')}
            className={`w-44 h-52 bg-white border rounded-2xl flex flex-col items-center justify-center gap-6 transition-all duration-200 hover:bg-[#F97316]/10 hover:border-[#F97316]/50 ${value === 'mobile' ? 'bg-[#F97316]/10 border-[#F97316]' : 'border-gray-200'
              }`}
          >
            <div className="text-7xl">📱</div>
            <span className="text-lg text-gray-900">mobile app</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('web')}
            className={`w-44 h-52 bg-white border rounded-2xl flex flex-col items-center justify-center gap-6 transition-all duration-200 hover:bg-[#F97316]/10 hover:border-[#F97316]/50 ${value === 'web' ? 'bg-[#F97316]/10 border-[#F97316]' : 'border-gray-200'
              }`}
          >
            <div className="text-7xl">💻</div>
            <span className="text-lg text-gray-900">web app</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('both')}
            className={`w-44 h-52 bg-white border rounded-2xl flex flex-col items-center justify-center gap-6 transition-all duration-200 hover:bg-[#F97316]/10 hover:border-[#F97316]/50 ${value === 'both' ? 'bg-[#F97316]/10 border-[#F97316]' : 'border-gray-200'
              }`}
          >
            <div className="text-5xl flex items-center gap-1">
              <span>📱</span>
              <span className="text-4xl text-gray-900">/</span>
              <span>💻</span>
            </div>
            <span className="text-lg text-gray-900">both</span>
          </button>

          <button
            type="button"
            onClick={() => onChange('other')}
            className={`w-44 h-52 bg-white border rounded-2xl flex flex-col items-center justify-center gap-6 transition-all duration-200 hover:bg-[#F97316]/10 hover:border-[#F97316]/50 ${value === 'other' ? 'bg-[#F97316]/10 border-[#F97316]' : 'border-gray-200'
              }`}
          >
            <div className="flex gap-3 text-4xl">
              <span className="w-3 h-3 bg-gray-900 rounded-full" />
              <span className="w-3 h-3 bg-gray-900 rounded-full" />
              <span className="w-3 h-3 bg-gray-900 rounded-full" />
            </div>
            <span className="text-lg text-gray-900">other</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            &lt; Go Back
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!value}
            className="px-8 py-3 bg-[#F97316] text-white rounded-lg font-medium hover:bg-[#F97316]/90 transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </SignupStepLayout>
  )
}