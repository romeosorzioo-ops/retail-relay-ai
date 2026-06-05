
-- Templates table (read-only catalog)
CREATE TABLE public.visual_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL,
  preview_url TEXT,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.visual_templates TO authenticated;
GRANT ALL ON public.visual_templates TO service_role;

ALTER TABLE public.visual_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visual_templates read all authenticated"
ON public.visual_templates
FOR SELECT
TO authenticated
USING (true);

-- Created visuals (user-owned)
CREATE TABLE public.created_visuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID,
  promotion_id UUID,
  template_id UUID,
  format TEXT NOT NULL,
  image_url TEXT,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.created_visuals TO authenticated;
GRANT ALL ON public.created_visuals TO service_role;

ALTER TABLE public.created_visuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "created_visuals own"
ON public.created_visuals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_created_visuals_updated_at
BEFORE UPDATE ON public.created_visuals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed templates
INSERT INTO public.visual_templates (name, category, format, config_json) VALUES
('Prix choc', 'promo', 'ig_square', '{"layout":"banner","primaryColor":"#E11D48","mainText":"PRIX CHOC","badge":{"text":"-30%","color":"#FACC15"},"productName":"Nom du produit","price":"2,99","oldPrice":"4,29"}'),
('Produit local', 'local', 'ig_square', '{"layout":"split","primaryColor":"#15803D","mainText":"Produit Local","badge":{"text":"LOCAL","color":"#15803D"},"productName":"Nom du producteur","price":"3,50","oldPrice":""}'),
('Nouveauté', 'nouveaute', 'ig_square', '{"layout":"centered","primaryColor":"#7C3AED","mainText":"NOUVEAUTÉ","badge":{"text":"NEW","color":"#7C3AED"},"productName":"Nom du produit","price":"","oldPrice":""}'),
('Arrivage', 'arrivage', 'ig_square', '{"layout":"banner","primaryColor":"#0891B2","mainText":"ARRIVAGE","badge":{"text":"FRAIS","color":"#0891B2"},"productName":"Produit frais","price":"","oldPrice":""}'),
('Recrutement', 'rh', 'fb_post', '{"layout":"centered","primaryColor":"#1E3A8A","mainText":"NOUS RECRUTONS","badge":{"text":"CDI","color":"#1E3A8A"},"productName":"Rejoignez notre équipe","price":"","oldPrice":""}'),
('Jeu concours', 'concours', 'ig_square', '{"layout":"centered","primaryColor":"#DB2777","mainText":"JEU CONCOURS","badge":{"text":"GAGNEZ","color":"#FACC15"},"productName":"Tentez votre chance","price":"","oldPrice":""}'),
('Offre week-end', 'weekend', 'ig_square', '{"layout":"banner","primaryColor":"#F97316","mainText":"OFFRE WEEK-END","badge":{"text":"SAM/DIM","color":"#F97316"},"productName":"Nom du produit","price":"4,99","oldPrice":"6,99"}'),
('Barbecue', 'saison', 'ig_square', '{"layout":"split","primaryColor":"#B91C1C","mainText":"SPÉCIAL BARBECUE","badge":{"text":"BBQ","color":"#B91C1C"},"productName":"Viandes & grillades","price":"","oldPrice":""}'),
('Rentrée', 'saison', 'ig_square', '{"layout":"centered","primaryColor":"#2563EB","mainText":"BONNE RENTRÉE","badge":{"text":"SEPT.","color":"#2563EB"},"productName":"Nos offres rentrée","price":"","oldPrice":""}'),
('Noël', 'saison', 'story', '{"layout":"centered","primaryColor":"#059669","mainText":"JOYEUSES FÊTES","badge":{"text":"NOËL","color":"#DC2626"},"productName":"Sélection de Noël","price":"","oldPrice":""}');
