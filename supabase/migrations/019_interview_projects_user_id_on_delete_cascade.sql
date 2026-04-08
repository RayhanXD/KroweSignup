-- Ensure deleting an auth user also removes their interview project row.
ALTER TABLE public.interview_projects
  DROP CONSTRAINT IF EXISTS interview_projects_user_id_fkey;

ALTER TABLE public.interview_projects
  ADD CONSTRAINT interview_projects_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
