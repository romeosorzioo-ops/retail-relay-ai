ALTER TABLE public.generated_contents ALTER COLUMN reel_idea DROP NOT NULL;
ALTER TABLE public.generated_contents ALTER COLUMN facebook_post DROP NOT NULL;
ALTER TABLE public.generated_contents ALTER COLUMN instagram_post DROP NOT NULL;
ALTER TABLE public.generated_contents ALTER COLUMN instagram_story DROP NOT NULL;

ALTER TABLE public.generated_contents
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS content_text text;

INSERT INTO public.generated_contents (user_id, promotion_id, content_type, content_text, created_at, updated_at)
SELECT user_id, promotion_id, 'facebook_post', facebook_post, created_at, updated_at
FROM public.generated_contents
WHERE content_type IS NULL AND facebook_post IS NOT NULL AND facebook_post <> '';

INSERT INTO public.generated_contents (user_id, promotion_id, content_type, content_text, created_at, updated_at)
SELECT user_id, promotion_id, 'instagram_post', instagram_post, created_at, updated_at
FROM public.generated_contents
WHERE content_type IS NULL AND instagram_post IS NOT NULL AND instagram_post <> '';

INSERT INTO public.generated_contents (user_id, promotion_id, content_type, content_text, created_at, updated_at)
SELECT user_id, promotion_id, 'instagram_story', instagram_story, created_at, updated_at
FROM public.generated_contents
WHERE content_type IS NULL AND instagram_story IS NOT NULL AND instagram_story <> '';

INSERT INTO public.generated_contents (user_id, promotion_id, content_type, content_text, created_at, updated_at)
SELECT user_id, promotion_id, 'reel_idea', reel_idea, created_at, updated_at
FROM public.generated_contents
WHERE content_type IS NULL AND reel_idea IS NOT NULL AND reel_idea <> '';

DELETE FROM public.generated_contents WHERE content_type IS NULL;

ALTER TABLE public.generated_contents
  DROP COLUMN IF EXISTS facebook_post,
  DROP COLUMN IF EXISTS instagram_post,
  DROP COLUMN IF EXISTS instagram_story,
  DROP COLUMN IF EXISTS reel_idea;

ALTER TABLE public.generated_contents
  ADD COLUMN IF NOT EXISTS reel_idea text;

ALTER TABLE public.generated_contents
  ALTER COLUMN content_type SET NOT NULL,
  ALTER COLUMN content_text SET NOT NULL;

ALTER TABLE public.generated_contents
  DROP CONSTRAINT IF EXISTS generated_contents_content_type_check;
ALTER TABLE public.generated_contents
  ADD CONSTRAINT generated_contents_content_type_check
  CHECK (content_type IN ('facebook_post','instagram_post','instagram_story','reel_idea'));

CREATE INDEX IF NOT EXISTS idx_generated_contents_promotion_id ON public.generated_contents(promotion_id);
CREATE INDEX IF NOT EXISTS idx_generated_contents_created_at ON public.generated_contents(created_at DESC);