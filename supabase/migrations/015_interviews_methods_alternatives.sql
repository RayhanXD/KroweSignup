ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS competitors_used JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS alternatives_used JSONB NOT NULL DEFAULT '[]'::jsonb;
