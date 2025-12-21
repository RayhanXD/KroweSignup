'use client'

type TargetCustomerStepProps = {
    value: string;
    onChange: (v: string) => void;
    onBack?: () => void;
    onContinue: () => void;
    progressPercent?: number // works for progress bar on the main page
}

export default function TargetCustomerStep({
    value,
    onChange,
    onBack,
    onContinue,
    progressPercent = 55, //tweak if need to change the look of the progress
}: TargetCustomerStepProps) {
    return(
         <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="text-3xl font-bold tracking-wide text-orange-600">
            KROWE
          </div>
          <div className="w-12 h-12 bg-gray-800 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl" />
        </div>

        <div className="max-w-5xl mx-auto mb-16">
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-orange-600 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-8">🧍‍♂️</div>

            <h1 className="text-4xl font-semibold text-gray-900 mb-6 text-center">
              who is your target customer?
            </h1>

            <p className="text-gray-400 text-center mb-8 max-w-2xl leading-relaxed">
              Use this template: Our target customer is a [age range] [type of
              person], currently [specific situation], who cares about [their
              priority], and is looking for [specific outcome]
            </p>

            <textarea
              className="w-full h-64 px-6 py-5 text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-gray-300 mb-10"
              placeholder="Ex: Our target customer is a 18–24 year old college student, currently juggling classes and part-time work, who cares about building projects for their resume, and is looking for a simple way to launch real startups with low risk"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />

            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                &lt; Go Back
              </button>

              <button
                type="button"
                onClick={onContinue}
                disabled={value.trim().length < 25}
                className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
}