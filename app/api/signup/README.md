# Signup API Routes

This directory contains all API routes for the signup flow.

## Structure

```
app/api/signup/
├── session/
│   ├── start/           # POST - Create new signup session
│   └── [sessionId]/     # GET - Get session by ID
├── answer/
│   ├── route.ts         # POST - Submit and validate answer
│   └── confirm/         # POST - Confirm answer and advance
├── complete/            # POST - Mark signup as complete
├── scrape/              # GET/POST/PUT - URL scrape fast-track onboarding
└── report/
    ├── generate/        # POST - Generate report for session
    └── [sessionId]/     # GET - Get report by session ID
```

## Routes

### Session Management

#### `POST /api/signup/session/start`
Creates a new signup session.

**Response:**
```json
{
  "sessionId": "uuid",
  "currentStepKey": "age",
  "status": "in_progress"
}
```

#### `GET /api/signup/session/[sessionId]`
Retrieves an existing session.

**Response:**
```json
{
  "sessionId": "uuid",
  "currentStepKey": "idea",
  "answersByStepKey": { ... }
}
```

### Answer Submission

#### `POST /api/signup/answer`
Submits an answer for validation. Does not advance the step.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "stepKey": "idea",
  "answerText": "...",
  "force": false
}
```

**Response:**
```json
{
  "validationStatus": "ok" | "needs_fix",
  "issues": [...],
  "failCount": 0,
  "canContinueWithWarning": false,
  "nextStepKey": "product_type" | null,
  "aiSuggestion": "..." | null,
  "aiReason": "..." | null
}
```

#### `POST /api/signup/answer/confirm`
Confirms an answer and advances to the next step.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "stepKey": "idea",
  "finalAnswer": "...",
  "finalSource": "original" | "ai_suggested" | "user_edited" | "override"
}
```

**Response:**
```json
{
  "ok": true,
  "nextStepKey": "product_type" | null
}
```

### Completion

#### `POST /api/signup/complete`
Marks a signup session as complete.

**Request Body:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "ok": true
}
```

### URL Fast-Track Scraping

#### `GET /api/signup/scrape?sessionId=...`
Loads the current extracted draft (ownership-checked).

#### `POST /api/signup/scrape`
Scrapes a website via Jina Reader and extracts onboarding answers with OpenAI.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "draft": { "...": "..." }
}
```

#### `PUT /api/signup/scrape`
Updates the extracted draft answers before final completion.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "draft": { "...": "..." }
}
```

### Report Generation

#### `POST /api/signup/report/generate`
Starts **background** generation for a completed signup session:

- **Report** → `signup_reports` (existing pipeline: enrichment, then `status: ready`).
- **Curriculum** → `signup_curricula` (OpenAI JSON validated against `curriculumPayloadSchema` in [`lib/curriculum/schema.ts`](../../../lib/curriculum/schema.ts)).
- **Roadmap progress** → `signup_roadmap_progress` is upserted (`unlocked_stage_max: 1`, `completed_task_ids: []`) before work runs.

Failures are **independent** (e.g. report can succeed if curriculum fails). The HTTP response returns immediately with `status: processing` while work continues.

**Request Body:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "reportId": "uuid",
  "sessionId": "uuid",
  "status": "processing"
}
```

When both artifacts are already at the current `REPORT_VERSION` and `CURRICULUM_JSON_VERSION`, the handler returns `"status": "ready"` without re-enqueueing.

#### `POST /api/signup/report/refresh` (development only)
Regenerates **report and curriculum** in parallel for a `sessionId`. Returns `404` in production.

### Manual test checklist (Plan B)

1. Apply SQL migrations [`001`](../../../supabase/migrations/001_curriculum.sql) and [`002`](../../../supabase/migrations/002_curriculum_processing_status.sql) in Supabase.
2. Complete signup and land on `/signup/complete?sessionId=...` (triggers `POST /api/signup/report/generate`).
3. In Supabase: `signup_reports.status = ready`, `signup_curricula.status = ready` with non-null `payload`, `signup_roadmap_progress.unlocked_stage_max = 1`.
4. Optional: force curriculum failure (e.g. invalid API key) and confirm `signup_reports` can still become `ready` while `signup_curricula.status = failed`.

### Manual test checklist (Plan C — platform roadmap, no auth)

1. Set `NEXT_PUBLIC_PLATFORM_URL` on the signup app to your platform origin (e.g. `http://localhost:3001`).
2. On the report page, click **Continue to dashboard** → platform opens `/roadmap?session_id=...` and loads curriculum from Supabase (anon RLS); stages above `unlocked_stage_max` are locked.

#### `GET /api/signup/report/[sessionId]`
Retrieves a generated report.

**Response:**
```json
{
  "id": "uuid",
  "status": "ready",
  "report": { ... },
  "created_at": "...",
  "updated_at": "..."
}
```
