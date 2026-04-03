CREATE POLICY "signup_sessions_insert_authenticated"
  ON public.signup_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "signup_sessions_select_authenticated"
  ON public.signup_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
