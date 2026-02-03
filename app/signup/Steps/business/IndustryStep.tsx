'use client'

import type { ReactNode } from 'react'
import SignupStepLayout from '../SignupStepLayout'
import {
  GraduationCap,
  Wallet,
  Heart,
  ShoppingCart,
  Layers,
  Store,
  Palette,
  MoreHorizontal,
  Factory,
  ChevronLeft,
} from 'lucide-react'

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

interface Industry {
  id: IndustryId
  name: string
  description: string
  icon: ReactNode
}

export default function IndustryStep({
  value,
  otherValue,
  onChange,
  onOtherChange,
  onBack,
  onContinue,
  progressPercent = 0,
}: IndustryStepProps) {
  const industries: Industry[] = [
    {
      id: 'edtech',
      name: 'EdTech',
      description:
        'Educational technology platforms, online learning, and knowledge-sharing tools',
      icon: <GraduationCap className="w-6 h-6" />,
    },
    {
      id: 'fintech',
      name: 'FinTech',
      description:
        'Tech-powered financial services like payments, banking, lending, and investing',
      icon: <Wallet className="w-6 h-6" />,
    },
    {
      id: 'health',
      name: 'Health / Wellness',
      description:
        'Healthcare technology, fitness apps, mental health, and wellness platforms',
      icon: <Heart className="w-6 h-6" />,
    },
    {
      id: 'ecommerce',
      name: 'E-commerce',
      description:
        'Online retail, direct-to-consumer brands, and digital shopping experiences',
      icon: <ShoppingCart className="w-6 h-6" />,
    },
    {
      id: 'saas',
      name: 'SaaS / Productivity',
      description:
        'Software-as-a-service tools, workflow automation, and productivity solutions',
      icon: <Layers className="w-6 h-6" />,
    },
    {
      id: 'marketplace',
      name: 'Marketplace',
      description:
        'Platforms connecting buyers and sellers, two-sided marketplaces, and peer-to-peer services',
      icon: <Store className="w-6 h-6" />,
    },
    {
      id: 'creator',
      name: 'Creator Tools',
      description:
        'Tools and platforms for content creators, influencers, and digital artists',
      icon: <Palette className="w-6 h-6" />,
    },
    {
      id: 'other',
      name: 'Other',
      description: 'If none of these fit your idea, select this and type your industry',
      icon: <MoreHorizontal className="w-6 h-6" />,
    },
  ]

  const canContinue = !!value && (value !== 'other' || otherValue.trim().length >= 3)

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-6xl mx-auto flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-2">
            <Factory className="w-12 h-12 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            what industry does your idea fall under
          </h1>
          <p className="text-sm text-gray-500 max-w-3xl mx-auto">
            based on the answers you gave prior we picked some that we thought were the best fit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {industries.map((industry) => (
            <button
              key={industry.id}
              type="button"
              onClick={() => onChange(industry.id)}
              className={[
                'relative p-3 rounded-xl border-2 transition-all duration-200 text-left',
                value === industry.id
                  ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md hover:scale-[1.02]',
              ].join(' ')}
            >
              <div
                className={[
                  'mb-2 inline-flex',
                  value === industry.id ? 'text-orange-500' : 'text-orange-400',
                ].join(' ')}
              >
                {industry.icon}
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {industry.name}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {industry.description}
              </p>

              {value === industry.id && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Show text input only if "other" is selected */}
        {value === 'other' && (
          <div className="max-w-2xl mx-auto mb-6">
            <label className="block text-sm text-gray-600 mb-2">
              Type your industry
            </label>
            <input
              value={otherValue}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder="Example: Real Estate, LegalTech, HR, Robotics..."
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className={[
              'px-8 py-3 rounded-lg font-semibold transition-all duration-200',
              canContinue
                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ].join(' ')}
          >
            Continue
          </button>
        </div>
      </div>
    </SignupStepLayout>
  )
}
