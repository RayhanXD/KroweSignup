'use client'

import { Users } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'

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

  const displayValue = teamSize === 30 ? '30+' : teamSize
  const displayText = teamSize === 30 ? 'person' : 'people'

  return (
    <>
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-6xl mx-auto flex flex-col">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex flex-col">
            <div className="mb-8">
              <Users className="w-16 h-16 text-slate-400" strokeWidth={1.5} />
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              how many people are on your team?
            </h1>

            <p className="text-lg text-gray-400 mb-16">
              it's okay to not have anyone yet
            </p>

            <div className="w-full max-w-2xl">
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {displayValue} {displayText}
                </span>
              </div>

              <div className="relative px-2">
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={teamSize}
                  onChange={(e) => onChange(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${(teamSize / 30) * 100}%, #e5e7eb ${(teamSize / 30) * 100}%, #e5e7eb 100%)`,
                  }}
                />

                <div className="flex justify-between mt-3 px-1">
                  <span className="text-sm text-gray-400">0</span>
                  <span className="text-sm text-gray-400">30+</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-24">
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
              className="px-8 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Continue
            </button>
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