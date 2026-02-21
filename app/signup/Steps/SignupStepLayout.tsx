'use client'

import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useSignupFixBanner } from '../SignupFixBannerContext'

type SignupStepLayoutProps = {
  progressPercent?: number
  children: ReactNode
}

/**
 * Shared header + main slot + footer for all signup question steps.
 * Use this so header/footer stay the same; only change the content passed as children.
 */
export default function SignupStepLayout({ progressPercent = 0, children }: SignupStepLayoutProps) {
  const fixBanner = useSignupFixBanner()
  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-2 md:py-3">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <img src="/KroweLogo.png" alt="Krowe Logo" className="h-10 w-auto md:h-12" />
            </div>
            <div className="flex-1 flex justify-center min-w-0 px-2 -ml-12 md:-ml-16">
              <div className="w-full max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="flex-shrink-0 w-6 md:w-8" aria-hidden />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-12">
        {fixBanner && (
          <div className="w-full max-w-6xl mb-6">
            {fixBanner}
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {children}
          <div className="w-full max-w-6xl mx-auto px-6 pt-10 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" aria-hidden />
              <span>Your intellectual property is private and encrypted.</span>
            </div>
          </div>
        </div>
      </main>
      <footer className="mt-auto w-full py-6 text-center">
        <p className="text-xs text-muted-foreground tracking-wide">© 2026 Krowe Technologies Inc.</p>
      </footer>
    </div>
  )
}
