DO $$
BEGIN
  IF to_regclass('public.extracted_problems') IS NULL THEN
    RAISE NOTICE 'Skipping migration 011: public.extracted_problems does not exist.';
    RETURN;
  END IF;

  ALTER TABLE public.extracted_problems
    ADD COLUMN IF NOT EXISTS verbatim_quote text;
END
$$;
