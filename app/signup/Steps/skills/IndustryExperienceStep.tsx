'use client'

import { Lock } from 'lucide-react'
import SignupStepLayout from '../SignupStepLayout'

type IndustryExperienceStepProps = {
  value: string;
  onChange: (v: string) => void;
  onBack?: () => void;
  onContinue: () => void
  progressPercent?: number;
}

export default function IndustryExperienceStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 66, //adjust this to change progress bar on this page
}: IndustryExperienceStepProps) {
  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/40 via-transparent to-transparent pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start p-6 md:p-8">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 pt-4">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFF8F1] text-[#FF6B00] mb-2 border border-[#FFECD9] shadow-sm">
                  <span className="material-symbols-outlined">domain</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                  What&apos;s your <br /> <span className="text-orange-500 bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">industry experience</span>, if any?
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                  Don&apos;t feel pressured to lie or make up experience, knowing where you are will help us take you to where you want to be.
                </p>
              </div>
            </div>
            <div className="lg:col-span-7 w-full">
              <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-gray-100 overflow-hidden relative group transition-all duration-500 hover:shadow-lg hover:ring-gray-200">
                <div className="relative min-h-[300px] flex flex-col pb-20">
                  <div className="w-full px-6 py-8 md:px-8 md:py-10">
                  <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-6" htmlFor="experience">
                    Industry Experience
                  </label>
                  <div className="relative w-full">
                    <textarea
                      id="experience"
                      name="experience"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder="Ex: Junior in college, VP of Operations (Entrepreneurship Club) — organized pitch nights and led outreach, Business Operations Intern — supported customer research and tracked growth, Personal projects — built landing pages/basic apps, Strengths — coachable, fast learner, consistent"
                      rows={6}
                      className="block w-full text-base font-medium text-gray-900 border-0 border-b-2 border-gray-100 focus:border-gray-100 focus:ring-0 focus:outline-none bg-transparent p-0 placeholder:text-gray-300 transition-all duration-300 resize-none leading-relaxed selection:bg-orange-100 selection:text-orange-900"
                    />
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
                    disabled={value.trim().length < 3}
                    className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 bg-gray-900 rounded-lg hover:bg-primary-600 hover:shadow-lg hover:shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none"
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
        {/* Privacy Notice */}
        <footer className="px-6 pt-10 pb-4 w-full flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Your intellectual property is private and encrypted.</span>
          </div>
        </footer>
      </div>
    </SignupStepLayout>
  )
}