
-- Add 3 font roles to brand_profiles
ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS font_primary TEXT,
  ADD COLUMN IF NOT EXISTS font_secondary TEXT,
  ADD COLUMN IF NOT EXISTS font_price TEXT;

-- Migrate existing font_family into font_primary
UPDATE public.brand_profiles
   SET font_primary = COALESCE(font_primary, font_family)
 WHERE font_primary IS NULL AND font_family IS NOT NULL;

-- Per-store / per-user font library (uploaded TTF/OTF/WOFF/WOFF2)
CREATE TABLE IF NOT EXISTS public.brand_fonts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_fonts TO authenticated;
GRANT ALL ON public.brand_fonts TO service_role;

ALTER TABLE public.brand_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their own fonts"
  ON public.brand_fonts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brand_fonts_user_idx ON public.brand_fonts(user_id);
