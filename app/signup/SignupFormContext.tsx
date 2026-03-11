'use client'

import { createContext, useContext, type ReactNode } from 'react'

type SignupFormContextValue = {
  submitting: boolean
}

const SignupFormContext = createContext<SignupFormContextValue>({ submitting: false })

export function SignupFormProvider({
  value,
  children,
}: {
  value: SignupFormContextValue
  children: ReactNode
}) {
  return (
    <SignupFormContext.Provider value={value}>
      {children}
    </SignupFormContext.Provider>
  )
}

export function useSignupForm() {
  return useContext(SignupFormContext)
}
