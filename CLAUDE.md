# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

No test runner is configured.

## Architecture

### Overview

KroweSignup is an AI-powered multi-step business signup form. Users fill out ~10 steps about their business idea; each answer is validated server-side and optionally rewritten by an AI. After completion, a full business report is generated using parallel LLM calls and displayed at `/report/[sessionId]`.

### Data Flow

```
/signup (client) → useSignupSession hook → API routes → Supabase
                                    ↓
                          OpenAI (validation rewrites)
                                    ↓
                    /api/signup/complete → /api/signup/report/generate
                                              ↓
                                    4 parallel LLM modules
                                    (competitors, MVP cost, market size, things needed)
                                              ↓
                                    signup_reports table → /report/[sessionId]
```

### Two-Phase Answer Submission

Answers go through a two-step process:
1. `POST /api/signup/answer` — validates the answer; if failing, calls OpenAI (`lib/aiRewrite.ts`) for a suggested rewrite. Returns issues + suggestion but does **not** write a final answer.
2. `POST /api/signup/answer/confirm` — writes `final_answer` + `final_source` ("original" | "ai_suggested" | "user_edited") to the DB and advances the session to the next step.

After 2 failures, `canContinueWithWarning` is set and the user may bypass validation.

### Step Configuration

Step order and types are defined in `lib/signupSteps.tsx`. The `StepKey` union type is the canonical identifier for each step. Helpers like `getNextStepKey()` and `getStepIndex()` live here.

### Report Generation Pipeline

`lib/report/generateReportForSession.ts` is the orchestrator:
1. Loads all confirmed answers from `signup_answers`
2. Maps them to a `SignupPayload` via `buildInputsFromAnswers.ts`
3. Runs 4 LLM tasks in parallel with `Promise.all()`:
   - `findCompetitors.ts` — web search + LLM analysis
   - `estimateMvpCost.ts` — cost breakdown
   - `marketsize.ts` — TAM/SAM/SOM estimates
   - `thingsNeeded.ts` — resource/tool requirements
4. Assembles sections via `buildReport.ts` + `lib/report/sections/`
5. Saves to `signup_reports` with status "ready"

Partial LLM failures are handled gracefully — missing modules don't block the report.

### Session State

Sessions are persisted in Supabase and the `sessionId` is stored in `localStorage`. On page load, `useSignupSession` (`lib/useSignupSession.ts`) checks localStorage, resumes an existing session, or creates a new one via `POST /api/signup/session/start`.

### Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `signup_sessions` | Session state: `id`, `status` (in_progress/completed), `current_step_key` |
| `signup_answers` | Per-step: `raw_answer`, `validation_status`, `ai_suggestion`, `fail_count`, `final_answer`, `final_source`, `confirmed_at` |
| `signup_responses` | Legacy consolidated payload JSON (created at completion) |
| `signup_reports` | Generated report JSON + `status` (pending/ready) |

### Validation

Rules live in `lib/validators.ts` and `lib/validation/rules.ts` (keyword lists). Only 3 steps support AI rewriting: `idea`, `problem`, `target_customer`. Constants like min/max age, hours ranges, and team sizes are in `lib/constants.ts`.

### Key Directories

- `app/signup/Steps/` — One component per step
- `app/report/[sessionId]/` — Server-rendered report display
- `lib/report/` — All report generation logic
- `lib/types/` — Shared TypeScript types (`session.ts`, `answers.ts`, `report.ts`, `validation.ts`)

### Environment Variables

Validated at startup in `lib/env.ts`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
