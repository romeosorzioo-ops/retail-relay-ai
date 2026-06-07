
-- Enseignes connues : on garde en text libre + check non strict pour permettre "Autre" et extensions
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS store_brand text;

ALTER TABLE public.visual_templates
  ADD COLUMN IF NOT EXISTS allowed_brands text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.brand_fonts
  ADD COLUMN IF NOT EXISTS allowed_brands text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_visual_templates_allowed_brands
  ON public.visual_templates USING GIN (allowed_brands);
CREATE INDEX IF NOT EXISTS idx_brand_fonts_allowed_brands
  ON public.brand_fonts USING GIN (allowed_brands);

CREATE TABLE IF NOT EXISTS public.brand_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  name text,
  primary_color text,
  secondary_color text,
  accent_color text,
  logo_url text,
  title_font_id uuid REFERENCES public.brand_fonts(id) ON DELETE SET NULL,
  body_font_id uuid REFERENCES public.brand_fonts(id) ON DELETE SET NULL,
  price_font_id uuid REFERENCES public.brand_fonts(id) ON DELETE SET NULL,
  badge_style text,
  arrow_style text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_guidelines TO authenticated;
GRANT ALL ON public.brand_guidelines TO service_role;

ALTER TABLE public.brand_guidelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read brand guidelines" ON public.brand_guidelines;
CREATE POLICY "Authenticated users can read brand guidelines"
  ON public.brand_guidelines FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_brand_guidelines_updated_at
  BEFORE UPDATE ON public.brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_brand_guidelines_brand ON public.brand_guidelines(brand);
