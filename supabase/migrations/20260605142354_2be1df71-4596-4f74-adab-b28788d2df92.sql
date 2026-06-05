ALTER TABLE public.created_visuals
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'template',
  ADD COLUMN IF NOT EXISTS source_image_url text;