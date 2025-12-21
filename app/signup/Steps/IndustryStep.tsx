'use client'

import { Briefcase, ChevronLeft } from "lucide-react"
import React from 'react'

type IndustryStepProps = {
    value: string | null
    otherValue: string
    onChange:(v: string) => void
    onOtherChange: (v: string) => void
    onBack?: () => void
    onContinue: () => void 
}

const OPTIONS = [
    'EdTech',
    'FinTech',
    'Health / Wellness',
    'E-commerce',
    'SaaS / Productivity',
    'Marketplace',
    'Creator Tools',
    'Other',
] as const

function OptionButton({
    label,
    selected,
    onClick,
}: {
    label: string
    selected: boolean
    onClick: () => void
}) {
    return(
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left border rounded-xl px-4 py-4 transition-colors',
        selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50',
      ].join(' ')}
    >
      <div className="font-medium text-gray-900">{label}</div>
      <div className="text-sm text-gray-500">Select this industry</div>
    </button>
  )
}

export default function IndustryStep ({
    value,
    otherValue,
    onChange,
    onOtherChange,
    onBack,
    onContinue,
}: IndustryStepProps) {
    const canContinue =
    !!value && (value !== 'Other' || otherValue.trim().length >=3)

     return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-8">
          <Briefcase className="w-7 h-7 text-gray-600" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-semibold text-gray-800 mb-2">
          What industry does this fall under?
        </h1>

        <p className="text-gray-400 text-sm mb-10 text-center">
          Pick the closest match. If none fit, choose “Other”.
        </p>

        <div className="w-full grid grid-cols-1 gap-3">
          {OPTIONS.map((opt) => (
            <OptionButton
              key={opt}
              label={opt}
              selected={value === opt}
              onClick={() => onChange(opt)}
            />
          ))}
        </div>

        {value === 'Other' && (
          <div className="w-full mt-4">
            <label className="text-xs text-gray-400">
              Type your industry (example: “Real Estate”, “HR”, “LegalTech”)
            </label>
            <input
              value={otherValue}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder="Your industry..."
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        )}

        <div className="flex gap-4 mt-10 w-full">
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
            disabled={!canContinue}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}