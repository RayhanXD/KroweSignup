'use client'

import type { ChangeEvent } from 'react';
import { ArrowRight, User } from 'lucide-react';
import SignupStepLayout from '../SignupStepLayout';
import { useSignupForm } from '../../SignupFormContext';

type AgeStepProps = {
  value: number;
  onChange: (age: number) => void;
  onBack: () => void;
  onContinue: () => void;
  progressPercent?: number
}

export default function AgeStep({ value, onChange, onBack, onContinue, progressPercent = 0 }: AgeStepProps) {
  const age = value;
  const { submitting } = useSignupForm();

  const handleAgeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = event.target.value.replace(/\D/g, '');

    if (!numericValue) {
      onChange(0);
      return;
    }

    const parsedValue = Math.min(120, parseInt(numericValue, 10));
    onChange(parsedValue);
  };

  return (
    <SignupStepLayout progressPercent={progressPercent}>
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-12 md:gap-16 items-stretch">
          <div className="space-y-6">
            <div className="animate-fade-slide-in step-delay-1 w-12 h-12 bg-primary-soft/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>

            <div className="animate-fade-slide-in step-delay-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">How old</h1>
              <h1 className="text-3xl md:text-4xl font-bold text-primary">are you?</h1>
            </div>

            <p className="animate-fade-slide-in step-delay-3 text-muted-foreground leading-relaxed max-w-sm">
              We tailor the Krowe incubator experience to different life stages. Your age helps us match you with the right peer cohort.
            </p>

            <div className="animate-fade-slide-in step-delay-4 bg-surface-subtle rounded-lg p-5 space-y-3 max-w-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-soft" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Privacy Note
                </span>
              </div>
              <p className="font-mono text-sm text-foreground leading-relaxed">
                This information is kept <span className="text-primary">private</span> and is only used for us to understand how fit you are for your idea.
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="animate-fade-slide-in step-delay-5 flex-1 flex flex-col items-center justify-center">
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
                Enter Your Age
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={age === 0 ? '' : age.toString()}
                onChange={handleAgeChange}
                className="text-7xl md:text-8xl font-light text-center text-foreground bg-transparent border-none outline-none w-full max-w-[200px] placeholder:text-muted-foreground/30 transition-colors"
                placeholder="18"
              />

              <div className="w-32 h-px bg-border mt-2" />
            </div>

            <div className="animate-fade-slide-in step-delay-6 flex items-center justify-between mt-16 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Auto-saved</span>
              </div>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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


