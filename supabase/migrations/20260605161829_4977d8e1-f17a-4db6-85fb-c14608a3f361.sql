
ALTER TABLE public.catalog_promotions ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.campaign_items ADD COLUMN IF NOT EXISTS thumbnail_url text;

UPDATE public.catalog_promotions
   SET thumbnail_url = product_image_url
 WHERE thumbnail_url IS NULL AND product_image_url IS NOT NULL;

UPDATE public.campaign_items
   SET thumbnail_url = source_image_url
 WHERE thumbnail_url IS NULL AND source_image_url IS NOT NULL;
