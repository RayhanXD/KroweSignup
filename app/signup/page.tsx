'use client'

import { useState } from 'react'
import AgeStep from './Steps/AgeStep'
import IdeaStep from './Steps/IdeaStep'
import ProductTypeStep from './Steps/ProductTypeStep'
import ProblemStep from './Steps/ProblemStep'
import TargetCustomerStep from './Steps/TargetCustomerStep'
import IndustryStep from './Steps/IndustryStep'

export default function SignupPage() {
  const [age, setAge] = useState(18)
  const [currentPhase, setCurrentPhase] = useState<'age' | 'idea' | 'product_type' | 'problem' | 'target_customer' | 'industry'>('age')
  const [idea, setIdea] = useState('')
  const [productType, setProductType] = useState<'mobile' | 'web' | 'both' | 'other' | null>(null)
  const [problem, setProblem] = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [industry, setIndustry] = useState<string | null>(null)
  const [industryOther, setIndustryOther] = useState('')

  async function handleIndustryContinue () {
    if (!industry) return

    const payload =  
    industry === 'Other' ? industryOther.trim() : industry

    const data = await sendToApi(payload)
    const next = data.signupState?.current_phase
    console.log('Next phase:', next)
    if (next) setCurrentPhase(next)
  }

  async function handleTargetCustomerContinue() {
    const data = await sendToApi(targetCustomer)
    const next = data.signupState?.current_phase 
    console.log('Next phase:', next)
    if (next) setCurrentPhase(next)
  }

  async function handleProblemContinue() {
    const data = await sendToApi(problem)
    const next = data.signupState?.current_phase
    console.log('Next Phase:', next)
    if (next) setCurrentPhase(next)
  }


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

   async function handleProductTypeContinue() {
    if(!productType) return
    const data = await sendToApi(productType) // send web app, mobile, both or none 
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
          onBack={() => setCurrentPhase('age')}
          onContinue={handleIdeaContinue}
        />
      )
    }

    if (currentPhase === 'product_type') {
      return (
        <ProductTypeStep
          value={productType}
          onChange={setProductType}
          onBack={() => setCurrentPhase('idea')}
          onContinue={handleProductTypeContinue}
        />
      )
    }

    if (currentPhase === 'problem') {
      return(
        <ProblemStep
        value={problem}
        onChange={setProblem}
        onBack={() => setCurrentPhase('product_type')}
        onContinue={handleProblemContinue}
        />
      )
    }

    if (currentPhase === 'target_customer'){
      return (
        <TargetCustomerStep
        value={targetCustomer}
        onChange={setTargetCustomer}
        onBack={() => setCurrentPhase('problem')}
        onContinue = {handleTargetCustomerContinue}
        progressPercent={55}
        />
      )
    }

    if (currentPhase === 'industry'){
      return(
        <IndustryStep
         value = {industry}
         otherValue = {industryOther}
         onChange = {(v) => {
          setIndustry (v)
          if (v !== 'Other') setIndustryOther('')
         }} 
        onOtherChange = {setIndustryOther}
        onBack = {() => setCurrentPhase('target_customer')}
        onContinue={handleIndustryContinue}
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
