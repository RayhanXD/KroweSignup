'use client'

import { useState } from 'react'
import AgeStep from './Steps/AgeStep'
import IdeaStep from './Steps/IdeaStep'
import ProductTypeStep from './Steps/ProductTypeStep'
import ProblemStep from './Steps/ProblemStep'
import TargetCustomerStep from './Steps/TargetCustomerStep'
import IndustryStep, { IndustryId } from './Steps/IndustryStep'
import IndustryExperienceStep from './Steps/IndustryExperienceStep'
import SkillsStep from './Steps/SkillsStep'
import TeamSizeStep from './Steps/TeamSizeStep'
import HoursCommitmentStep from './Steps/HoursStep'

export default function SignupPage() {
  const [age, setAge] = useState(18)
  const [currentPhase, setCurrentPhase] = useState<'age' | 'idea' | 'product_type' | 'problem' | 'target_customer' | 'industry' | 'industry_experience' | 'skills_start'
    | 'team_size'>('age')
  const [idea, setIdea] = useState('')
  const [productType, setProductType] = useState<'mobile' | 'web' | 'both' | 'other' | null>(null)
  const [problem, setProblem] = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [industry, setIndustry] = useState<IndustryId | null>(null)
  const [industryOther, setIndustryOther] = useState('')
  const [industryExperience, setIndustryExperience] = useState('')
  const [skills, setSkills] = useState<Array<'dev' | 'marketing' | 'leadership' | 'other' | 'none'>>([])
  const [teamSize, setTeamSize] = useState(1)
  const [hours, setHours] = useState(6)


  async function handleHoursContinue() {
    const data = await sendToApi(String(hours))
    const next = data.signupState?.current_phase
    console.log('Next phase:', next)
    if (next) setCurrentPhase(next)
  }

  async function handleTeamSizeContinue() {
    const data = await sendToApi(String(teamSize))
    const next = data.signupState?.current_phase
    console.log('Next Phase: ', next)
    if (next) setCurrentPhase(next)
  }


  async function handleSkillsContinue() {
    const payload = skills.join(',') // ex: dev,marketing or none
    const data = await sendToApi(payload)
    const next = data.signupState?.current_phase
    console.log('Next Phase: ', next)
    if (next) setCurrentPhase(next)
  }

  async function handleIndustryExperienceContinue() {
    const data = await sendToApi(industryExperience)
    const next = data.signupState?.current_phase
    console.log('Next Phase: ', next)
    if (next) setCurrentPhase(next)
  }


  async function handleIndustryContinue() {
    if (!industry) return

    const payload =
      industry === 'other' ? industryOther.trim() : industry

    const data = await sendToApi(payload)
    const next = data.signupState?.current_phase
    console.log('Next phase:', next)
    if (next) setCurrentPhase(next)
  }

  async function handleTargetCustomerContinue() {
    try {
      const data = await sendToApi(targetCustomer)
      const next = data.signupState?.current_phase
      console.log('API Response:', data)
      console.log('Current phase:', currentPhase)
      console.log('Next phase:', next)
      
      // Only update if phase actually changed
      if (next && next !== currentPhase) {
        setCurrentPhase(next)
      } else if (data.reply) {
        // If validation failed, show the error message
        console.error('Validation error:', data.reply)
        alert(data.reply)
      }
    } catch (error) {
      console.error('Error in handleTargetCustomerContinue:', error)
      alert('An error occurred. Please try again.')
    }
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
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`API error: ${res.status} - ${errorText}`)
    }
    
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
    if (!productType) return
    const data = await sendToApi(productType) // send web app, mobile, both or none 
    const next = data.signupState?.current_phase
    console.log('Next Phase:', next)
    if (next) setCurrentPhase(next)
  }

  if (currentPhase === 'age') {
    return (
      <AgeStep
        value={age}
        onChange={setAge}
        onBack={() => console.log('Back pressed')}
        onContinue={handleAgeContinue}
        progressPercent={5}
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
        progressPercent={15}
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
        progressPercent={25}
      />
    )
  }

  if (currentPhase === 'problem') {
    return (
      <ProblemStep
        value={problem}
        onChange={setProblem}
        onBack={() => setCurrentPhase('product_type')}
        onContinue={handleProblemContinue}
        progressPercent={42}
      />
    )
  }

  if (currentPhase === 'target_customer') {
    return (
      <TargetCustomerStep
        value={targetCustomer}
        onChange={setTargetCustomer}
        onBack={() => setCurrentPhase('problem')}
        onContinue={handleTargetCustomerContinue}
        progressPercent={55}
      />
    )
  }

  if (currentPhase === 'industry') {
    return (
      <IndustryStep
        value={industry}
        otherValue={industryOther}
        onChange={(v) => {
          setIndustry(v)
          if (v !== 'other') setIndustryOther('') // ✅ clear the OTHER text only
        }}
        onOtherChange={setIndustryOther}
        onBack={() => setCurrentPhase('target_customer')}
        onContinue={handleIndustryContinue}
        progressPercent={65}
      />
    )
  }


  if (currentPhase === 'industry_experience') {
    return (
      <IndustryExperienceStep
        value={industryExperience}
        onChange={setIndustryExperience}
        onBack={() => setCurrentPhase('industry')}
        onContinue={handleIndustryExperienceContinue}
      />
    )
  }

  if (currentPhase === 'skills_start') {
    return (
      <SkillsStep
        value={skills}
        onChange={setSkills}
        onBack={() => setCurrentPhase('industry_experience')}
        onContinue={handleSkillsContinue}
        progressPercent={78}
      />
    )
  }

  if (currentPhase === 'team_size') {
    return (
      <TeamSizeStep
        value={teamSize}
        onChange={setTeamSize}
        onBack={() => setCurrentPhase('skills_start')}
        onContinue={handleTeamSizeContinue}
        progressPercent={86}
      />
    )
  }

  if (currentPhase === 'hours_commitment') {
    return (
      <HoursCommitmentStep
        value={hours}
        onChange={setHours}
        onBack={() => setCurrentPhase('team_size')}
        onContinue={handleHoursContinue}
        progressPercent={100}
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
