'use client'
import { useState } from 'react';
import { User, ChevronLeft } from 'lucide-react';

type AgeStepProps = {
  value: number;
  onChange: (age: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function AgeStep({ value, onChange, onBack, onContinue }: AgeStepProps) {
  const age = value;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center px-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-8">
          <User className="w-7 h-7 text-gray-600" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-semibold text-gray-800 mb-2">
          How old are you
        </h1>

        <p className="text-gray-400 text-sm mb-16">
          This helps us know your startup success
        </p>

        <div className="w-full mb-4">
          <p className="text-2xl font-semibold text-gray-800 mb-6">
            {age} years old
          </p>

          <input
            type="range"
            min="0"
            max="60"
            value={age}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-none"
            style={{
              background: `linear-gradient(to right, #1f2937 0%, #1f2937 ${(age / 60) * 100}%, #e5e7eb ${(age / 60) * 100}%, #e5e7eb 100%)`,
            }}
          />

          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>0</span>
            <span>60+</span>
          </div>
        </div>

        <div className="flex justify-between gap-4 mt-16 w-full">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Go back
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="flex items-center justify-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

