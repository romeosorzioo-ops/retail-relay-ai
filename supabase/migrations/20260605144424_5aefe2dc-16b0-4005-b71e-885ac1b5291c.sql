
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  store_id uuid NULL,
  catalog_import_id uuid NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_creation','ready_to_schedule','scheduled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_owner_all" ON public.campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaign_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  catalog_promotion_id uuid NULL,
  user_id uuid NOT NULL,
  store_id uuid NULL,
  product_name text NOT NULL,
  promo_price numeric NULL,
  old_price numeric NULL,
  discount_percent numeric NULL,
  category text NULL,
  start_date date NULL,
  end_date date NULL,
  source_image_url text NULL,
  creation_mode text NULL CHECK (creation_mode IN ('catalog_visual','field_photo')),
  status text NOT NULL DEFAULT 'to_create' CHECK (status IN ('to_create','in_progress','to_validate','validated','scheduled')),
  recommended_platform text NULL,
  recommended_format text NULL,
  recommended_date date NULL,
  recommended_time text NULL,
  generated_caption text NULL,
  final_visual_url text NULL,
  scheduled_post_id uuid NULL REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_items_campaign_idx ON public.campaign_items(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_items TO authenticated;
GRANT ALL ON public.campaign_items TO service_role;
ALTER TABLE public.campaign_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_items_owner_all" ON public.campaign_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaign_items_set_updated_at BEFORE UPDATE ON public.campaign_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
