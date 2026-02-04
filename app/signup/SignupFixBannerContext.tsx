'use client'

import { createContext, useContext, type ReactNode } from 'react'

const SignupFixBannerContext = createContext<ReactNode>(null)

export function SignupFixBannerProvider({
  value,
  children,
}: {
  value: ReactNode
  children: ReactNode
}) {
  return (
    <SignupFixBannerContext.Provider value={value}>
      {children}
    </SignupFixBannerContext.Provider>
  )
}

export function useSignupFixBanner() {
  return useContext(SignupFixBannerContext)
}
