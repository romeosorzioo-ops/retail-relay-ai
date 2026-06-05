DROP POLICY IF EXISTS "meta_connections own" ON public.meta_connections;

CREATE POLICY "meta_connections insert own" ON public.meta_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meta_connections update own" ON public.meta_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meta_connections delete own" ON public.meta_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
