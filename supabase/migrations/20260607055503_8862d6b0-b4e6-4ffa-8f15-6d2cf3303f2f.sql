-- Revoke read access to sensitive token columns from client roles
REVOKE SELECT (user_access_token, page_access_token) ON public.meta_connections FROM authenticated;
REVOKE SELECT (user_access_token, page_access_token) ON public.meta_connections FROM anon;

-- Allow users to read their own non-token metadata
DROP POLICY IF EXISTS "meta_connections select own" ON public.meta_connections;
CREATE POLICY "meta_connections select own"
  ON public.meta_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);