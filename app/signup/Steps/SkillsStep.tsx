'use client '

type SkillId = 'dev' | 'marketing' | 'leadership' | 'other' | 'none'

type SkillsStepProps = {
    value: SkillId[]
    onChange: (v: SkillId[]) => void
    onBack?: () => void
    onContinue: () => void
    progressPercent?: number
}

export default function SkillsStep({
    value,
    onChange,
    onBack,
    onContinue,
    progressPercent = 78,
}: SkillsStepProps){
    const selectedSkills = value

    const skills = [
        { id: 'dev', label: 'Dev', icon: '💻', color: 'bg-purple-400' },
    { id: 'marketing', label: 'Marketing', icon: '📣', color: 'bg-orange-400' },
    { id: 'leadership', label: 'Leadership', icon: '🏆', color: 'bg-yellow-400' },
    { id: 'other', label: 'Other', icon: '•••', color: 'bg-gray-300' },
    { id: 'none', label: 'None', icon: '🚫', color: 'bg-red-400' },
    ] as const

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

      return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-[#F97316] font-bold text-2xl tracking-wide">KROWE</span>
          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-gray-700 rounded-sm"></div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F97316] rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-6xl mb-6">🏢</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              what are your current skills if any?
            </h1>
            <p className="text-gray-400 text-lg">choose all that apply to you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {skills.slice(0, 4).map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                  selectedSkills.includes(skill.id)
                    ? 'bg-[#F97316]/10 border-[#F97316]'
                    : 'bg-white border-gray-200 hover:bg-[#F97316]/5'
                }`}
              >
                <div
                  className={`${skill.color} w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0`}
                >
                  {skill.icon}
                </div>
                <span className="text-gray-900 font-medium text-lg">{skill.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => toggleSkill('none')}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                selectedSkills.includes('none')
                  ? 'bg-[#F97316]/10 border-[#F97316]'
                  : 'bg-white border-gray-200 hover:bg-[#F97316]/5'
              }`}
            >
              <div className="bg-red-400 w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
                🚫
              </div>
              <span className="text-gray-900 font-medium text-lg">None</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              &lt; Go Back
            </button>

            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="px-8 py-3 bg-[#F97316] text-white rounded-lg font-medium hover:bg-[#F97316]/90 transition-all disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}