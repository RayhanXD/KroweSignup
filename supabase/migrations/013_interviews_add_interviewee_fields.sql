ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS interviewee_name TEXT,
ADD COLUMN IF NOT EXISTS interviewee_context TEXT;
