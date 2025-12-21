'use client'

import { useState } from 'react'
import AgeStep from './Steps/AgeStep'
import IdeaStep from './Steps/IdeaStep'

export default function SignupPage() {
  const [age, setAge] = useState(18)
  const [currentPhase, setCurrentPhase] = useState<'age' | 'idea' | 'product_type'>('age')
  const [idea, setIdea] = useState('')

  async function sendToApi(message: string) {
    const res = await fetch('/api/signup/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    const data = await res.json()
    return data
  }

  async function handleAgeContinue() {
   // for now send age to your existing API shape
    const data = await sendToApi(String(age))
    const next = data.signupState?.current_phase
    console.log('Next Phase:', next)
    if (next) setCurrentPhase(next)
   }

   async function handleIdeaContinue() {
    const data = await sendToApi(idea)
    const next = data.signupState?.current_phase
    console.log('Next Phase:', next)
    if (next) setCurrentPhase(next)
   }

   if (currentPhase === 'age'){
    return (
      <AgeStep
        value={age}
        onChange={setAge}
        onBack={() => console.log('Back pressed')}
        onContinue={handleAgeContinue}
      />
    )
   }

    if (currentPhase === 'idea') {
      return (
        <IdeaStep
          value={idea}
          onChange={setIdea}
          onBack={() => console.log('Back pressed')}
          onContinue={handleIdeaContinue}
        />
      )
    }

    // temporary placeholder until we build Q3 screen next
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 border rounded-lg bg-white">
        <p className="font-medium text-gray-800">Next phase: {currentPhase}</p>
        <p className="text-sm text-gray-500 mt-2">
          We’ll build this screen next.
        </p>
      </div>
    </div>
  )
}
