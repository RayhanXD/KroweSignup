ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS interviews_tags_gin
  ON public.interviews USING gin(tags);
