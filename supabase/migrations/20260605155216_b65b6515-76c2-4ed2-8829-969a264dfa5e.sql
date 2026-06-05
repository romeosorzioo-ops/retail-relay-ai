
-- 1. Recreate RLS policies on user-owned tables, scoped to 'authenticated' role only

DROP POLICY IF EXISTS "users manage their own fonts" ON public.brand_fonts;
CREATE POLICY "users manage their own fonts" ON public.brand_fonts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own brand profile" ON public.brand_profiles;
CREATE POLICY "Users manage own brand profile" ON public.brand_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaign_items_owner_all" ON public.campaign_items;
CREATE POLICY "campaign_items_owner_all" ON public.campaign_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own campaign_recommendations" ON public.campaign_recommendations;
CREATE POLICY "users manage own campaign_recommendations" ON public.campaign_recommendations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaigns_owner_all" ON public.campaigns;
CREATE POLICY "campaigns_owner_all" ON public.campaigns
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own catalog_imports" ON public.catalog_imports;
CREATE POLICY "users manage own catalog_imports" ON public.catalog_imports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own catalog pages" ON public.catalog_pages;
CREATE POLICY "Users manage their own catalog pages" ON public.catalog_pages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own catalog_promotions" ON public.catalog_promotions;
CREATE POLICY "users manage own catalog_promotions" ON public.catalog_promotions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Restrict SELECT on Meta OAuth token columns so they are never returned to the client.
--    Tokens must only be read server-side via the service role.
REVOKE SELECT (user_access_token, page_access_token) ON public.meta_connections FROM authenticated;
REVOKE SELECT (user_access_token, page_access_token) ON public.meta_connections FROM anon;

-- 3. Lock down SECURITY DEFINER helper functions: they are only meant to be
--    invoked by triggers / event triggers, never directly from the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
