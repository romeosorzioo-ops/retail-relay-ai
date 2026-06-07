## Espace Admin Komaag

### 1. Rôles utilisateurs (sécurité)

- Nouvelle enum `app_role` : `user`, `admin`.
- Nouvelle table `user_roles (user_id, role)` + fonction `has_role()` SECURITY DEFINER (pattern recommandé Supabase, anti-récursion RLS).
- RLS : un utilisateur voit ses propres rôles ; les admins peuvent tout lire/écrire.
- Hook client `useIsAdmin()` qui interroge `user_roles`.
- Layout protégé `/_authenticated/_admin` (gate `beforeLoad` → redirect `/dashboard` si non-admin).
- Item « Admin » dans la sidebar masqué pour les non-admins.
- Le premier admin sera promu manuellement via SQL (je fournirai la commande à la fin).

### 2. Storage

Création de 3 buckets **privés** (URLs signées au runtime) :
- `template-assets`
- `font-assets`
- `graphic-assets`

Policies : lecture pour `authenticated`, écriture réservée aux admins via `has_role()`.

### 3. Tables

| Table | Champs métier |
|---|---|
| `visual_templates` (refonte) | name, brand, category, format, image_url, is_active |
| `font_assets` | name, family, style, usage, brand (nullable), file_url, is_active |
| `graphic_assets` | name, type (arrow/badge/sticker/price_label/local_icon/shape), brand (nullable), file_url, is_active |
| `creation_presets` | name, brand, format, template_id, title_font_id, price_font_id, graphic_asset_ids[], config_json, is_active |

**Migration douce** sur `visual_templates` : on ajoute `brand`, `image_url`, `is_active` (existent déjà : `name`, `category`, `format`, `preview_url`, `config_json`, `allowed_brands` créé au tour précédent). `preview_url` → fallback de `image_url`. `allowed_brands` reste compatible avec le filtrage déjà en place.

Toutes les tables ont leurs grants + RLS + policies (lecture authentifié, écriture admin) + trigger `updated_at`.

### 4. Routes admin (`/_authenticated/_admin/*`)

- `/admin` → tableau de bord (compteur d'assets par type).
- `/admin/templates` → liste + upload PNG + édition + activer/désactiver/supprimer.
- `/admin/fonts` → liste + upload `.ttf/.otf/.woff/.woff2` + édition.
- `/admin/graphics` → liste + upload PNG/SVG + édition par type.
- `/admin/presets` → création de presets en sélectionnant template + polices + éléments + enseigne + format.

Chaque page : table + formulaire d'édition (Dialog), upload via base64 → server fn → storage privé → `getPublicUrl` ou `createSignedUrl` (selon visibilité).

### 5. Server functions

Un fichier par domaine (`templates.functions.ts`, `font-assets.functions.ts`, `graphic-assets.functions.ts`, `presets.functions.ts`) avec :
- `listXxxFn` (filtrable par brand / is_active)
- `upsertXxxFn` (admin only via middleware `requireAdmin`)
- `deleteXxxFn`
- `uploadXxxFileFn` (admin only, valide MIME + taille)

Nouveau middleware `requireAdmin` qui empile `requireSupabaseAuth` puis vérifie `has_role(uid, 'admin')`.

### 6. Intégration module Création

- Nouvelle requête `listActivePresetsForMyStoreFn` :
  - retourne presets `is_active = true`
  - filtrés par enseigne du magasin
  - fallback automatique sur `brand = 'Générique'` si rien trouvé
- Galerie de presets affichée en haut de l'éditeur, à côté/à la place de la sélection de template actuelle.
- Sélection d'un preset → applique : template (fond du visuel), polices titre/prix, éléments graphiques, `config_json`.
- Les textes, prix, logo et éléments restent éditables (logique existante conservée).

### 7. Hors scope (à proposer après)

- UI de promotion d'utilisateurs en admin (pour cette V1, promotion via SQL).
- Versioning des presets.
- Aperçu live du preset avant sélection.

### Détails techniques

- Buckets privés + `createSignedUrl(60 * 60 * 24 * 7)` pour l'affichage.
- Upload : base64 côté client → server fn → `supabase.storage.from(bucket).upload()` (chemin `${admin_user_id}/${type}/${timestamp}-${rand}.${ext}`).
- Validation Zod côté serveur sur toutes les entrées (déjà la convention du projet).
- Tous les `CREATE TABLE` dans `public` reçoivent `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated` + `GRANT ALL TO service_role`, puis RLS scopée par `has_role()`.
- L'erreur runtime « Failed to fetch dynamically imported module » du HMR sera résolue par le redéploiement après migration.

Confirmez et je lance la migration DB + la création des buckets, puis le code.