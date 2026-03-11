'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'
import { useSignupForm } from '../../SignupFormContext'

type SkillId = 'dev' | 'marketing' | 'leadership' | 'other' | 'none'

type SkillsStepProps = {
  value: SkillId[]
  onChange: (v: SkillId[]) => void
  onBack?: () => void
  onContinue: () => void
  progressPercent?: number
}

interface SkillOption {
  id: SkillId
  label: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
}

const SKILL_OPTIONS: SkillOption[] = [
  {
    id: 'dev',
    label: 'Dev',
    description: 'Coding, software engineering, technical architecture.',
    icon: 'code',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Growth, SEO, content strategy, brand management.',
    icon: 'campaign',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
  {
    id: 'leadership',
    label: 'Leadership',
    description: 'Team management, vision setting, executive roles.',
    icon: 'emoji_events',
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
  {
    id: 'none',
    label: 'None',
    description: 'I am new to this and looking to learn from scratch.',
    icon: 'block',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
]

export default function SkillsStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 78,
}: SkillsStepProps) {
  const selectedSkills = value
  const [otherText, setOtherText] = useState('')
  const { submitting } = useSignupForm()

  const toggleSkill = (skillId: SkillId) => {
    if (skillId === 'none') {
      onChange(selectedSkills.includes('none') ? [] : ['none'])
    } else {
      const newSkills = selectedSkills.includes(skillId)
        ? selectedSkills.filter((s) => s !== skillId)
        : [...selectedSkills.filter((s) => s !== 'none'), skillId]
      onChange(newSkills)
    }
  }

  const canContinue = selectedSkills.length > 0

  const cardBase =
    'block h-full cursor-pointer bg-white border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition-all duration-200 relative flex items-center gap-4'
  const cardChecked =
    'border-orange-400 shadow-md ring-1 ring-orange-400 bg-orange-50/50'
  const checkIconBase =
    'absolute top-4 right-4 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center transition-all duration-200'
  const checkIconHidden = 'opacity-0 transform scale-75'
  const checkIconVisible = 'opacity-100 scale-100'

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="flex-grow flex items-center justify-center p-6 md:p-12 relative overflow-x-hidden overflow-y-visible w-full">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left column - pulled up so it sits centered with the selection cards */}
          <div className="lg:col-span-4 flex flex-col space-y-8 lg:sticky lg:top-24 -mt-56 lg:-mt-64">
            <div className="space-y-4">
              <div className="animate-fade-slide-in step-delay-1 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mb-2 border border-orange-100/50 shadow-sm">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h1 className="animate-fade-slide-in step-delay-2 text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                What are your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">
                  current skills
                </span>
                , if any?
              </h1>
              <p className="animate-fade-slide-in step-delay-3 text-lg text-gray-500 leading-relaxed">
                Identify your key strengths to help us match you with the right
                resources and potential co-founders.
              </p>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 w-full pt-8 lg:pt-12">
            <div className="animate-fade-slide-in step-delay-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {SKILL_OPTIONS.map((skill) => (
                <div key={skill.id} className="relative group">
                  <input
                    className="sr-only"
                    id={`skill_${skill.id}`}
                    name="skills"
                    type="checkbox"
                    value={skill.id}
                    checked={selectedSkills.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                  />
                  <label
                    htmlFor={`skill_${skill.id}`}
                    className={`${cardBase} ${selectedSkills.includes(skill.id) ? cardChecked : ''}`}
                  >
                    <div
                      className={`${checkIconBase} ${selectedSkills.includes(skill.id) ? checkIconVisible : checkIconHidden}`}
                    >
                      <span className="material-symbols-outlined text-[14px] font-bold">
                        check
                      </span>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-lg ${skill.iconBg} ${skill.iconColor} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="material-symbols-outlined">
                        {skill.icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {skill.label}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>
                  </label>
                </div>
              ))}

              {/* Other card with text input */}
              <div className="relative group col-span-1 md:col-span-2">
                <input
                  className="sr-only"
                  id="skill_other"
                  name="skills"
                  type="checkbox"
                  value="other"
                  checked={selectedSkills.includes('other')}
                  onChange={() => toggleSkill('other')}
                />
                <label
                  htmlFor="skill_other"
                  className={`${cardBase} flex-col md:flex-row md:items-start ${selectedSkills.includes('other') ? cardChecked : ''}`}
                >
                  <div
                    className={`${checkIconBase} ${selectedSkills.includes('other') ? checkIconVisible : checkIconHidden}`}
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">
                      check
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined">
                      more_horiz
                    </span>
                  </div>
                  <div className="flex flex-col flex-grow w-full">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      Other
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      If you have a different skill set, please specify it here.
                    </p>
                    <div className="pt-1 w-full">
                      <input
                        type="text"
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        onFocus={() => {
                          if (!selectedSkills.includes('other')) {
                            onChange([
                              ...selectedSkills.filter((s) => s !== 'none'),
                              'other',
                            ])
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm border-0 border-b border-gray-200 focus:border-orange-500 focus:ring-0 focus:outline-none focus-visible:outline-none outline-none bg-transparent px-0 py-1 transition-colors placeholder:text-gray-400"
                        placeholder="Type your specific skill..."
                      />
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="animate-fade-slide-in step-delay-6 mt-10 flex items-center justify-end gap-5 border-t border-gray-100 pt-6">
              {onBack != null && (
                <button
                  type="button"
                  onClick={onBack}
                  className="text-gray-500 hover:text-gray-900 text-sm font-medium px-4 py-2 transition-colors focus:outline-none rounded-lg hover:bg-gray-50"
                >
                  Go Back
                </button>
              )}
              <button
                type="button"
                onClick={onContinue}
                disabled={!canContinue || submitting}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </SignupStepLayout>
  )
}
