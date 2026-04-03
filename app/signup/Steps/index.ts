/**
 * Step Components Index
 *
 * Centralized exports for all signup step components.
 * This makes it easy to import steps and see all available steps at a glance.
 */

// Business steps (reused in Product Path)
export { default as IdeaStep } from './business/IdeaStep'
export { default as ProblemStep } from './business/ProblemStep'
export { default as TargetCustomerStep } from './business/TargetCustomerStep'
export { default as IndustryStep, type IndustryId } from './business/IndustryStep'
export { default as ProductTypeStep } from './business/ProductTypeStep'

// Product Path steps
export { default as FeaturesStep } from './product/FeaturesStep'
export { default as CompetitorsStep } from './product/CompetitorsStep'
export { default as AlternativesStep } from './product/AlternativesStep'
export { default as PricingModelStep } from './product/PricingModelStep'
export { default as InterviewCountStep } from './product/InterviewCountStep'
export { default as InterviewUploadStep } from './product/InterviewUploadStep'
export { default as StartupStageStep } from './product/StartupStageStep'
export type { PricingModelValue } from './product/PricingModelStep'
export type { UploadedFile } from './product/InterviewUploadStep'
