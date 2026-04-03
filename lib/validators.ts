import { StepKey } from "@/lib/signupSteps";
import { VALIDATION_THRESHOLDS, VALIDATION_ERROR_CODES } from "@/lib/constants";
import { VALIDATION_MESSAGES } from "./validation/messages";
import {
  IDEA_REQUIRED_PHRASES,
  TARGET_CUSTOMER_REQUIRED_PHRASES,
  PROBLEM_SOLUTION_INDICATORS,
  PROBLEM_INDICATORS,
  PRODUCT_TYPE_ALLOWED,
  TARGET_CUSTOMER_FORBIDDEN,
} from "./validation/rules";
import { normalizeAnswer } from "@/lib/utils/strings";
import type { ValidationIssue, ValidationResult } from "@/lib/types/validation";

// Re-export types for backward compatibility
export type { ValidationIssue, ValidationResult };

function needsFix(code: string, message: string): ValidationResult {
  return { status: "needs_fix", issues: [{ code, message, severity: "error" }] };
}

export function validateStep(stepKey: StepKey, raw: string): ValidationResult {
  const v = normalizeAnswer(raw);

  // basic required
  if (!v) return needsFix(VALIDATION_ERROR_CODES.REQUIRED, VALIDATION_MESSAGES.REQUIRED);

  switch (stepKey) {
    case "idea": {
      const lower = v.toLowerCase();
      const hasAllPhrases = IDEA_REQUIRED_PHRASES.every(phrase => lower.includes(phrase));
      if (!hasAllPhrases) {
        return needsFix(VALIDATION_ERROR_CODES.FORMAT, VALIDATION_MESSAGES.IDEA_FORMAT);
      }
      if (v.length < VALIDATION_THRESHOLDS.TEXT_LENGTH.IDEA_MIN) {
        return needsFix(VALIDATION_ERROR_CODES.TOO_SHORT, VALIDATION_MESSAGES.IDEA_TOO_SHORT);
      }
      return { status: "ok", issues: [] };
    }

    case "problem": {
      const lower = v.toLowerCase();
      const hasSolutionIndicators = PROBLEM_SOLUTION_INDICATORS.some(phrase => lower.includes(phrase));
      const hasProblemIndicators = PROBLEM_INDICATORS.some(phrase => lower.includes(phrase));
      const looksLikeSolution = hasSolutionIndicators && !hasProblemIndicators;
      if (looksLikeSolution) {
        return needsFix(VALIDATION_ERROR_CODES.PROBLEM_NOT_SOLUTION, VALIDATION_MESSAGES.PROBLEM_NOT_SOLUTION);
      }
      if (v.length < VALIDATION_THRESHOLDS.TEXT_LENGTH.PROBLEM_MIN) {
        return needsFix(VALIDATION_ERROR_CODES.TOO_SHORT, VALIDATION_MESSAGES.PROBLEM_TOO_SHORT);
      }
      return { status: "ok", issues: [] };
    }

    case "target_customer": {
      const lower = v.toLowerCase();
      const missing = TARGET_CUSTOMER_REQUIRED_PHRASES.filter((p) => !lower.includes(p));
      if (missing.length) {
        return needsFix(VALIDATION_ERROR_CODES.FORMAT, VALIDATION_MESSAGES.TARGET_CUSTOMER_FORMAT);
      }
      if (TARGET_CUSTOMER_FORBIDDEN.some(word => lower.includes(word))) {
        return needsFix(VALIDATION_ERROR_CODES.TOO_BROAD, VALIDATION_MESSAGES.TARGET_CUSTOMER_TOO_BROAD);
      }
      return { status: "ok", issues: [] };
    }

    case "product_type": {
      const lower = v.toLowerCase();
      const ok = PRODUCT_TYPE_ALLOWED.some(type => lower.includes(type));
      if (!ok) return needsFix(VALIDATION_ERROR_CODES.CHOICE, VALIDATION_MESSAGES.PRODUCT_TYPE_CHOICE);
      return { status: "ok", issues: [] };
    }

    case "features": {
      let arr: unknown;
      try { arr = JSON.parse(v) } catch { arr = null }
      if (!Array.isArray(arr) || arr.length === 0) {
        return needsFix(VALIDATION_ERROR_CODES.REQUIRED, 'Add at least one feature.');
      }
      return { status: "ok", issues: [] };
    }

    case "pricing_model": {
      let parsed: { pricingModels?: string[] } | null = null;
      try { parsed = JSON.parse(v) } catch { parsed = null }
      if (!parsed?.pricingModels?.length) {
        return needsFix(VALIDATION_ERROR_CODES.REQUIRED, 'Select at least one pricing model.');
      }
      return { status: "ok", issues: [] };
    }

    case "interview_count": {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        return needsFix(VALIDATION_ERROR_CODES.NUMBER, 'Enter a valid number (0 or more).');
      }
      return { status: "ok", issues: [] };
    }

    case "startup_stage": {
      const valid = ['idea', 'validation', 'pre-mvp', 'mvp', 'early-traction', 'growth'];
      if (!valid.includes(v)) {
        return needsFix(VALIDATION_ERROR_CODES.CHOICE, 'Select a startup stage.');
      }
      return { status: "ok", issues: [] };
    }

    // Optional steps — always ok
    case "industry":
    case "competitors":
    case "alternatives":
    case "interview_upload":
    default:
      return { status: "ok", issues: [] };
  }
}
