# Extraction images produit + génération visuels depuis catalogue

Gros chantier — je découpe en 3 lots livrables successifs. Validation avant code.

## Pré-requis infra

- **Bucket Storage** `catalog-product-images` (public) — créé via tool storage.
- **Migration `catalog_promotions`** : ajouter
  - `product_image_url text`
  - `crop_coordinates jsonb` (`{x, y, width, height}` en % de la page)
  - `page_image_url text` (URL de la page entière en PNG, sert au recadrage manuel)
  - (`page_number` existe déjà)

## Lot 1 — Extraction automatique pendant l'analyse

Dans `analyzeSinglePage` (`src/lib/catalog.functions.ts`) :

1. **Rendu PNG de la page** : utiliser `pdfjs-dist` (compat Worker via `legacy/build/pdf.mjs`) pour rasteriser chaque page en PNG 1200px de large → upload dans `catalog-product-images/{userId}/{importId}/page-{n}.png`. Stocker l'URL dans `catalog_pages.page_image_url` (nouvelle colonne) ET sur chaque promo de la page.
2. **Prompt Gemini enrichi** : demander en plus, pour chaque promo détectée, une `bbox` normalisée `{x, y, width, height}` en % couvrant photo + nom + prix + remise.
3. **Crop côté serveur** : utiliser `@napi-rs/canvas` non — pas dispo en Worker. Alternative pure JS : décoder le PNG via `pngjs` + recadrer manuellement → ré-encoder PNG → upload `catalog-product-images/{userId}/{importId}/promo-{promoId}.png`. Stocker dans `product_image_url` + `crop_coordinates`.
4. Détection ratée (`bbox` absente) → `product_image_url = null`, l'utilisateur recadrera manuellement.

## Lot 2 — UI catalogue : aperçu + recadrage manuel

Dans `src/routes/_authenticated/catalog.tsx`, sur chaque carte de promo :

- **Miniature** de `product_image_url` à gauche (placeholder si absente).
- **Actions** : Recadrer / Remplacer (upload) / Supprimer.
- **Modal de recadrage** : affiche `page_image_url` plein écran avec overlay déplaçable/redimensionnable (composant maison léger, pas de lib externe — `pointermove` + state `{x,y,w,h}` en %). À la validation → appel serveur fn qui recrope depuis le PNG de page et met à jour la promo.
- **Remplacer** : input file → upload via fn dédiée → met à jour `product_image_url` (crop_coordinates = null).

Nouvelles server fns :
- `recropPromotionImageFn({ promotion_id, crop: {x,y,w,h} })`
- `replacePromotionImageFn({ promotion_id, file_name, file_type, data_base64 })`
- `deletePromotionImageFn({ promotion_id })`

## Lot 3 — "Générer ma campagne" → visuels social media

Bouton existant côté catalogue (ou nouveau) "Générer visuels". Pour chaque promo sélectionnée et chaque format (IG carré 1080, Story 1080×1920, FB 1200×630) :

- Composer un `config_json` réutilisant le schéma de blocs déjà en place dans `creation.tsx` (cf. plan typo) :
  - bg : couleur primaire du `brand_profile`
  - image produit (`product_image_url`)
  - bloc nom produit (police principale)
  - bloc prix promo (police prix, gros)
  - bloc ancien prix barré (si dispo)
  - badge remise (élément `badge_remise_immediate` de `graphic-elements.ts`)
  - flèche `arrow_dynamic` pointant le prix
  - logo magasin (`brand_profile.logo_url`)
- Insérer un `created_visuals` par format, lié à la promo (créer un nouveau champ `catalog_promotion_id` ? — non, on stocke dans `config_json.catalog_promotion_id` pour éviter une migration de plus, ou on convertit en `promotions` standard). **Décision proposée** : créer un vrai `promotions` row depuis la `catalog_promotion` au moment de "Générer campagne" (réutilise tout le pipeline existant : campaign_recommendations → scheduled_posts).
- Rendu PNG côté serveur : pas faisable simplement (canvas indispo Worker). **Approche** : on stocke uniquement le `config_json` ; le rendu PNG se fait à l'ouverture dans `creation.tsx` (DOM + `html-to-image`) ou au moment de la publication. Brouillon dans le calendrier comme aujourd'hui.

## Notes techniques

- **pdfjs-dist en Worker Cloudflare** : `legacy/build/pdf.mjs` fonctionne sans worker thread (`disableWorker: true`). À tester ; fallback = rendu via Gemini "redonne-moi la page entière en image" (pas idéal). J'essaie pdfjs en premier.
- **pngjs** est pure JS et bundle correctement.
- **Taille** : 1200px de large pour les pages = ~300 Ko/PNG, OK pour 50 pages.
- **Coût Gemini** : déjà multimodal, ajouter bbox dans le prompt ne change pas le coût.

## Questions avant de coder

1. **OK pour ajouter une dépendance `pdfjs-dist` + `pngjs`** ? (~2 Mo bundle SSR, négligeable)
2. **Lot 3 — workflow "Générer campagne"** : tu confirmes qu'on crée un `promotions` row standard à partir de chaque `catalog_promotion` (= réutilise tout le pipeline existant) plutôt que d'inventer un chemin parallèle ?
3. Je livre les **3 lots d'un coup** ou tu valides lot par lot ?
