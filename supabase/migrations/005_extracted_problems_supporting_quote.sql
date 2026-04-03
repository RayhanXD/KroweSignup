-- Paraphrase / essence of the pain point from the interview (see lib/interviews/extractProblems.ts)
ALTER TABLE public.extracted_problems
ADD COLUMN IF NOT EXISTS supporting_quote text;
