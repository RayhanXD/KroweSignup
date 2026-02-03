'use client'

import SignupStepLayout from '../SignupStepLayout'

type IdeaStepProps = {
  value: string;
  onChange: (v: string) => void;
  onBack?: () => void;
  onContinue?: () => void;
  progressPercent?: number; // optional (0-1)
}

export default function IdeaStep({
  value,
  onChange,
  onBack,
  onContinue,
  progressPercent = 22, // example 2/10 steps
}: IdeaStepProps) {
  const canContinue = value.trim().length > 20;

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
          <div className="text-4xl mb-1">💼</div>

          <h1 className="text-4xl font-semibold text-gray-900">
            What's your startup idea?
          </h1>

          <p className="text-gray-500 max-w-3xl">
            Use this template: [Startup Name] is a [short description of what it is] that [what it does]
            by [how it works in one simple phrase]
          </p>

          <textarea
            className="w-full h-64 p-6 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-gray-300 text-gray-900 placeholder:text-gray-400 mb-3"
            placeholder='Ex: Krowe is an interactive online incubator for young entrepreneurs that simplifies the startup journey from idea to launch by combining an AI Idea Analyzer with a step-by-step launching curriculum.'
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />

          <div className="w-full flex justify-between text-xs text-gray-400 mb-9">
            <span>{value.trim().length} characters</span>
            <span>{canContinue ? 'Looks good' : 'Add a little more detail'}</span>
          </div>

          <div className="w-full flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <span>&lt;</span>
              <span>Go Back</span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="px-10 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
    </SignupStepLayout>
  )
}