'use client'

type IndustryExperienceStepProps = {
    value: string;
    onChange: (v: string) => void;
    onBack?: () => void;
    onContinue: () => void
    progressPercent?: number;
}

export default function IndustryExperienceStep ({
    value,
    onChange,
    onBack,
    onContinue,
    progressPercent = 66, //adjust this to change progress bar on this page
}: IndustryExperienceStepProps) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="text-3xl font-bold text-orange-600 tracking-wide">
            KROWE
          </div>
          <div className="w-12 h-10 bg-gray-800 rounded-lg" />
        </div>

        <div className="mb-20">
          <div className="max-w-4xl mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-600 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-4xl mb-6">🏢</div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              whats your industry experience, if any?
            </h1>

            <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">
              don't feel pressured to lie or make up experience, knowing where you
              are will help us take you to where you want to be
            </p>
          </div>

          <div className="mb-8">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-64 px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none placeholder:text-gray-400 text-gray-700"
              placeholder="Ex: Junior in college, VP of Operations (Entrepreneurship Club) — organized pitch nights and led outreach, Business Operations Intern — supported customer research and tracked growth, Personal projects — built landing pages/basic apps, Strengths — coachable, fast learner, consistent"
            />
            <div className="mt-2 text-xs text-gray-400">
              {value.trim().length} characters
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              &lt; Go Back
            </button>

            <button
              type="button"
              onClick={onContinue}
              disabled={value.trim().length < 3}
              className="px-8 py-3 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}