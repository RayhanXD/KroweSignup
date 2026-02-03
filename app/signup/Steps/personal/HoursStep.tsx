'use client'

import { Clock } from 'lucide-react'
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
      <div className="w-full max-w-6xl mx-auto flex flex-col">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex flex-col mb-16">
            <div className="text-6xl mb-8">
              <Clock className="w-16 h-16 text-gray-600" strokeWidth={1.5} />
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              how many hours can you put in weekly?
            </h1>

            <p className="text-lg text-gray-400">
              keep this number realistic, your only like to yourself bruh
            </p>
          </div>

          <div className="flex flex-col mb-32">
            <div className="text-4xl font-bold text-gray-900 mb-8">
              {hours} {hours === 1 ? 'hour' : 'hours'}
            </div>

            <div className="w-full max-w-2xl px-4">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={max}
                  value={hours}
                  onChange={(e) => onChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${(hours / max) * 100}%, #e5e7eb ${(hours / max) * 100}%, #e5e7eb 100%)`,
                  }}
                />
              </div>

              <div className="flex justify-between mt-3">
                <span className="text-sm text-gray-400">0</span>
                <span className="text-sm text-gray-400">{max}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
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

