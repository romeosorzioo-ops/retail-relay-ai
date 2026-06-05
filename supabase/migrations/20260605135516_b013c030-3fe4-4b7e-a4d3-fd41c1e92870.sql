
ALTER TABLE public.catalog_promotions
  ADD COLUMN IF NOT EXISTS confidence integer,
  ADD COLUMN IF NOT EXISTS missing_fields jsonb,
  ADD COLUMN IF NOT EXISTS detection_source text NOT NULL DEFAULT 'ai';

CREATE TABLE IF NOT EXISTS public.catalog_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_import_id uuid NOT NULL REFERENCES public.catalog_imports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  page_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  promotions_count integer NOT NULL DEFAULT 0,
  notes text,
  error_message text,
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_import_id, page_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_pages TO authenticated;
GRANT ALL ON public.catalog_pages TO service_role;

ALTER TABLE public.catalog_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own catalog pages"
  ON public.catalog_pages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_catalog_pages_import ON public.catalog_pages(catalog_import_id);

CREATE TRIGGER update_catalog_pages_updated_at
  BEFORE UPDATE ON public.catalog_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
