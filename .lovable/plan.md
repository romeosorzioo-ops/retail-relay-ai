# Workflow Campagne : Catalogue → Calendrier

Objectif : enchaîner import catalogue, sélection de promos, création/validation de visuels et programmation dans un seul parcours guidé.

## 1. Base de données (migration Supabase)

Deux nouvelles tables + adaptations.

**`campaigns`**
- `id`, `user_id`, `store_id`, `catalog_import_id` (nullable)
- `name` (auto : "Campagne catalogue - <mois année>")
- `status` : `draft | in_creation | ready_to_schedule | scheduled`
- `created_at`, `updated_at`

**`campaign_items`**
- `id`, `campaign_id`, `catalog_promotion_id` (nullable), `store_id`
- Snapshot promo : `product_name`, `promo_price`, `old_price`, `discount_percent`, `category`, `start_date`, `end_date`, `source_image_url`
- `creation_mode` : `catalog_visual | field_photo` (nullable au départ)
- `status` : `to_create | in_progress | to_validate | validated | scheduled`
- Reco IA : `recommended_platform`, `recommended_format`, `recommended_date`, `recommended_time`, `generated_caption`
- `final_visual_url` (nullable), `scheduled_post_id` (nullable, FK scheduled_posts ON DELETE SET NULL)
- `created_at`, `updated_at`

RLS scope `auth.uid() = user_id` + GRANTs `authenticated` / `service_role`. Trigger `update_updated_at_column`.

## 2. Server functions (`src/lib/campaigns.functions.ts`)

- `createCampaignFromSelectionFn({ catalog_import_id, promotion_ids[] })` — crée la campagne + 1 `campaign_item` par promo (snapshot des champs depuis `catalog_promotions`), retourne `campaign_id`.
- `listCampaignItemsFn({ campaign_id? })` — par défaut la campagne active la plus récente non terminée.
- `updateCampaignItemFn({ id, creation_mode?, status?, final_visual_url?, generated_caption?, recommended_* })`.
- `attachScheduledPostToItemFn({ id, scheduled_post_id })` — passe le statut à `scheduled` et met à jour `campaigns.status` si tous les items sont scheduled.

## 3. Page Catalogue — Bouton flottant

Dans `src/routes/_authenticated/catalog.tsx` :
- Ajouter une `Set<string>` `selectedPromoIds` + checkbox sur chaque `PromoCard`.
- FAB en bas à droite (`fixed bottom-6 right-6`, ombre, gradient `bg-primary`) quand `selectedPromoIds.size > 0` : `"Générer ma campagne ({n})"`.
- Au clic → mutation `createCampaignFromSelectionFn` → `navigate({ to: "/creation", search: { campaign: id, tab: "queue" } })`.

## 4. Module Création — Onglet "File d'attente"

Dans `src/routes/_authenticated/creation.tsx` :
- `validateSearch` accepte `{ cp?, mode?, campaign?, tab?, item? }`.
- Header en `Tabs` : **Éditeur** / **File d'attente**.
- Onglet file : grille de cartes `campaign_items` avec image, nom, prix, remise, badge catégorie, dates, badge statut, sélecteur **Visuel catalogue / Photo terrain**, bouton **Ouvrir**.
- "Ouvrir" → charge l'éditeur avec préremplissage (image, prix, ancien prix, remise, caption IA si présente) et passe `item` en search param ; statut → `in_progress`.

## 5. Éditeur — Validation & programmation

- Bouton **Valider le visuel** : upload du PNG canvas → `final_visual_url` ; `updateCampaignItemFn({ status: 'validated', final_visual_url })`.
- Dialog post-validation : **Programmer maintenant** / **Retour à la file**.
- "Programmer" ouvre une modale (réutilise les champs de `scheduled-posts`) préremplie (caption IA, plateforme reco, date/heure reco, media = `final_visual_url`) → `createScheduledPostFn` → `attachScheduledPostToItemFn`.

## 6. Fil d'Ariane

Composant `<CampaignStepper>` partagé (5 étapes : Catalogue · Sélection · Création · Validation · Programmation), affiché en haut de Catalogue et Création, étape active dérivée de la route + statut campagne.

## Détails techniques

- Calculs reco simples côté serveur : plateforme = `facebook` par défaut, format = `fb_post`, date = `start_date ?? now()+2j`, heure = `10:00`, caption = template court à partir du nom/prix/remise (pas d'appel LLM nouveau pour ce lot).
- Pas de publication Meta : on s'arrête à la création du `scheduled_post` interne.
- Suppression d'un `scheduled_post` → `campaign_items.scheduled_post_id` repasse `NULL` via `ON DELETE SET NULL`, statut item recalé à `validated`.
- Types Supabase régénérés après la migration ; le code TanStack est ajouté ensuite.

## Plan d'exécution

1. Migration (`campaigns`, `campaign_items`, GRANTs, RLS, trigger).
2. `campaigns.functions.ts` + reco helper.
3. Catalogue : sélection + FAB + navigation.
4. Création : tabs, file d'attente, préremplissage depuis `campaign_item`.
5. Bouton "Valider le visuel" + dialog programmation.
6. `<CampaignStepper>` + intégration.
