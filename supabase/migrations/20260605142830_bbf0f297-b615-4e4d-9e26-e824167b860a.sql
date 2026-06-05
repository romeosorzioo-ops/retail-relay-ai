ALTER TABLE public.catalog_promotions
  ADD COLUMN IF NOT EXISTS creation_mode text;

ALTER TABLE public.catalog_promotions
  DROP CONSTRAINT IF EXISTS catalog_promotions_creation_mode_check;
ALTER TABLE public.catalog_promotions
  ADD CONSTRAINT catalog_promotions_creation_mode_check
  CHECK (creation_mode IS NULL OR creation_mode IN ('catalog_visual', 'field_photo'));