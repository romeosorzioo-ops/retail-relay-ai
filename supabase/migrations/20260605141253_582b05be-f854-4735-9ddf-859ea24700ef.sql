ALTER TABLE public.catalog_promotions
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS crop_coordinates jsonb,
  ADD COLUMN IF NOT EXISTS page_image_url text;

ALTER TABLE public.catalog_pages
  ADD COLUMN IF NOT EXISTS page_image_url text;