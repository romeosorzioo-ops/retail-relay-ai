ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_posts_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';