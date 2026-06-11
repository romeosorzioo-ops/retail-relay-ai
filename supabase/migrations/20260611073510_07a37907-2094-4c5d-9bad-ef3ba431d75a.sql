
REVOKE SELECT ON public.meta_connections FROM authenticated;
REVOKE SELECT ON public.meta_connections FROM anon;

GRANT SELECT (
  id, user_id, token_expires_at, fb_user_id, fb_user_name,
  page_id, page_name, ig_business_id, ig_username, status,
  created_at, updated_at
) ON public.meta_connections TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.meta_connections TO authenticated;
GRANT ALL ON public.meta_connections TO service_role;
