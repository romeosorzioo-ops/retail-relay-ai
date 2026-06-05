
-- Catalog imports
CREATE TABLE public.catalog_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_imports TO authenticated;
GRANT ALL ON public.catalog_imports TO service_role;
ALTER TABLE public.catalog_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own catalog_imports" ON public.catalog_imports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER catalog_imports_updated_at BEFORE UPDATE ON public.catalog_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX catalog_imports_user_idx ON public.catalog_imports(user_id, created_at DESC);

-- Catalog promotions
CREATE TABLE public.catalog_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_import_id UUID NOT NULL REFERENCES public.catalog_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  store_id UUID NULL,
  product_name TEXT NOT NULL,
  promo_price NUMERIC NULL,
  old_price NUMERIC NULL,
  discount_percent NUMERIC NULL,
  category TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  page_number INT NULL,
  social_score INT NULL,
  recommendation_reason TEXT NULL,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_promotions TO authenticated;
GRANT ALL ON public.catalog_promotions TO service_role;
ALTER TABLE public.catalog_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own catalog_promotions" ON public.catalog_promotions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER catalog_promotions_updated_at BEFORE UPDATE ON public.catalog_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX catalog_promotions_import_idx ON public.catalog_promotions(catalog_import_id);
CREATE INDEX catalog_promotions_user_idx ON public.catalog_promotions(user_id);

-- Campaign recommendations
CREATE TABLE public.campaign_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_promotion_id UUID NOT NULL REFERENCES public.catalog_promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  store_id UUID NULL,
  recommended_format TEXT NULL,
  recommended_platform TEXT NULL,
  recommended_date DATE NULL,
  recommended_time TEXT NULL,
  creative_angle TEXT NULL,
  visual_brief TEXT NULL,
  caption TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_post_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recommendations TO authenticated;
GRANT ALL ON public.campaign_recommendations TO service_role;
ALTER TABLE public.campaign_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own campaign_recommendations" ON public.campaign_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaign_recommendations_updated_at BEFORE UPDATE ON public.campaign_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX campaign_recommendations_promo_idx ON public.campaign_recommendations(catalog_promotion_id);
CREATE INDEX campaign_recommendations_user_idx ON public.campaign_recommendations(user_id);
