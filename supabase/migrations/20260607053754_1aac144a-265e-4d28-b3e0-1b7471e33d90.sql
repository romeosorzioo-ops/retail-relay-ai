
-- =========================
-- 1) RÔLES UTILISATEURS
-- =========================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- 2) VISUAL_TEMPLATES (extension)
-- =========================
ALTER TABLE public.visual_templates
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill image_url from preview_url
UPDATE public.visual_templates SET image_url = preview_url WHERE image_url IS NULL;

DROP TRIGGER IF EXISTS update_visual_templates_updated_at ON public.visual_templates;
CREATE TRIGGER update_visual_templates_updated_at
  BEFORE UPDATE ON public.visual_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.visual_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active templates" ON public.visual_templates;
CREATE POLICY "Authenticated users can read active templates"
  ON public.visual_templates FOR SELECT
  TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage templates" ON public.visual_templates;
CREATE POLICY "Admins can manage templates"
  ON public.visual_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- 3) FONT_ASSETS
-- =========================
CREATE TABLE IF NOT EXISTS public.font_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  family text NOT NULL,
  style text NOT NULL DEFAULT 'regular',
  usage text NOT NULL DEFAULT 'text',
  brand text,
  file_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.font_assets TO authenticated;
GRANT ALL ON public.font_assets TO service_role;

ALTER TABLE public.font_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active fonts" ON public.font_assets;
CREATE POLICY "Authenticated users can read active fonts"
  ON public.font_assets FOR SELECT
  TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage fonts" ON public.font_assets;
CREATE POLICY "Admins can manage fonts"
  ON public.font_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_font_assets_updated_at ON public.font_assets;
CREATE TRIGGER update_font_assets_updated_at
  BEFORE UPDATE ON public.font_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_font_assets_brand ON public.font_assets(brand);
CREATE INDEX IF NOT EXISTS idx_font_assets_active ON public.font_assets(is_active);

-- =========================
-- 4) GRAPHIC_ASSETS
-- =========================
CREATE TABLE IF NOT EXISTS public.graphic_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  brand text,
  file_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.graphic_assets TO authenticated;
GRANT ALL ON public.graphic_assets TO service_role;

ALTER TABLE public.graphic_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active graphics" ON public.graphic_assets;
CREATE POLICY "Authenticated users can read active graphics"
  ON public.graphic_assets FOR SELECT
  TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage graphics" ON public.graphic_assets;
CREATE POLICY "Admins can manage graphics"
  ON public.graphic_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_graphic_assets_updated_at ON public.graphic_assets;
CREATE TRIGGER update_graphic_assets_updated_at
  BEFORE UPDATE ON public.graphic_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_graphic_assets_brand ON public.graphic_assets(brand);
CREATE INDEX IF NOT EXISTS idx_graphic_assets_type ON public.graphic_assets(type);

-- =========================
-- 5) CREATION_PRESETS
-- =========================
CREATE TABLE IF NOT EXISTS public.creation_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL DEFAULT 'Générique',
  format text NOT NULL,
  template_id uuid REFERENCES public.visual_templates(id) ON DELETE SET NULL,
  title_font_id uuid REFERENCES public.font_assets(id) ON DELETE SET NULL,
  price_font_id uuid REFERENCES public.font_assets(id) ON DELETE SET NULL,
  graphic_asset_ids uuid[] NOT NULL DEFAULT '{}',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.creation_presets TO authenticated;
GRANT ALL ON public.creation_presets TO service_role;

ALTER TABLE public.creation_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active presets" ON public.creation_presets;
CREATE POLICY "Authenticated users can read active presets"
  ON public.creation_presets FOR SELECT
  TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage presets" ON public.creation_presets;
CREATE POLICY "Admins can manage presets"
  ON public.creation_presets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_creation_presets_updated_at ON public.creation_presets;
CREATE TRIGGER update_creation_presets_updated_at
  BEFORE UPDATE ON public.creation_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_creation_presets_brand ON public.creation_presets(brand);
CREATE INDEX IF NOT EXISTS idx_creation_presets_format ON public.creation_presets(format);
CREATE INDEX IF NOT EXISTS idx_creation_presets_active ON public.creation_presets(is_active);
