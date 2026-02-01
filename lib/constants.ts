/**
 * Centralized constants for the Krowe Signup application
 * 
 * This file contains all magic strings, numbers, and configuration values
 * to make it easy to modify behavior without changing logic.
 */

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  SESSION_ID: "krowe_signup_session_id",
} as const;

// ============================================================================
// Report Version
// ============================================================================

export const REPORT_VERSION = "6.2.3" as const;

// ============================================================================
// Validation Thresholds
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  // Age validation
  AGE: {
    MIN: 10,
    MAX: 100,
  },
  
  // Hours per week validation
  HOURS: {
    MIN: 1,
    MAX: 80,
    BURNOUT_RISK_THRESHOLD: 26, // Hours >= this triggers burnout warning
  },
  
  // Team size validation
  TEAM_SIZE: {
    MIN: 1,
    MAX: 30,
  },
  
  // Text length requirements
  TEXT_LENGTH: {
    IDEA_MIN: 30,
    PROBLEM_MIN: 15,
  },
  
  // Fail count before allowing "continue anyway"
  FAIL_COUNT_BEFORE_WARNING: 2,
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_VALUES = {
  AGE: 18,
  HOURS: 6,
  TEAM_SIZE: 1,
} as const;

// ============================================================================
// Validation Error Codes
// ============================================================================

export const VALIDATION_ERROR_CODES = {
  REQUIRED: "REQUIRED",
  NUMBER: "NUMBER",
  RANGE: "RANGE",
  FORMAT: "FORMAT",
  TOO_SHORT: "TOO_SHORT",
  PROBLEM_NOT_SOLUTION: "PROBLEM_NOT_SOLUTION",
  TOO_BROAD: "TOO_BROAD",
  CHOICE: "CHOICE",
  BURNOUT_RISK: "BURNOUT_RISK",
} as const;
