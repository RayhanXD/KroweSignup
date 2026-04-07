/**
 * API request/response types
 */

import { FinalAnswerSource } from "./answers";

/**
 * Request body for /api/signup/answer
 */
export type SubmitAnswerRequest = {
  sessionId: string;
  stepKey: string;
  answerText: string;
  force?: boolean;
};

/**
 * Request body for /api/signup/answer/confirm
 */
export type ConfirmAnswerRequest = {
  sessionId: string;
  stepKey: string;
  finalAnswer: string;
  finalSource: FinalAnswerSource;
};

/**
 * Request body for /api/signup/complete
 */
export type CompleteSignupRequest = {
  sessionId: string;
};

