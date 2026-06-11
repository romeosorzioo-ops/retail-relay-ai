## Objectif

Unifier l'étape **Création** : faire fonctionner le même éditeur (`/_authenticated/creation`) à la fois pour les clients connectés et dans le tunnel d'essai gratuit, avec un panneau de file d'attente des promotions sélectionnées dans les deux modes.

## Architecture

L'éditeur actuel (`src/routes/_authenticated/creation.tsx`, 1650 lignes) est monolithique et dépend de 8+ server functions Supabase. On l'extrait en composant réutilisable contrôlé par un "data source" pluggable, et on garde deux routes fines qui montent ce composant avec des sources différentes.

```text
src/components/creation/
  CreationEditor.tsx       <- ex-CreationPage, accepte props (mode, dataSource, queue)
  PromotionQueuePanel.tsx  <- nouveau panneau "✓ Apéricube / ✓ Pringles ..."
  data-source.ts           <- interface CreationDataSource
  data-source-supabase.ts  <- impl pour utilisateurs connectés (queries existantes)
  data-source-trial.ts     <- impl pour tunnel (lit useTunnelStore, no-op pour save)

src/routes/_authenticated/creation.tsx  <- monte <CreationEditor mode="app" dataSource={supabase} />
src/routes/essai.creation.tsx           <- remplacé : monte <CreationEditor mode="trial" dataSource={trial} />
```

## Étapes d'implémentation

1. **Extraire l'éditeur en composant**
   - Déplacer le contenu de `_authenticated/creation.tsx` vers `src/components/creation/CreationEditor.tsx` (export `CreationEditor`).
   - Identifier toutes les `useQuery`/`useMutation` dépendantes de Supabase (brand profile, guidelines, fonts, templates, promotions, campaign items, save visual) et les router via une interface `CreationDataSource` injectée en prop.
   - L'UI (canvas, panneaux Modèles/Texte/Éléments/Importer/Marque/IA, toolbar) reste inchangée.

2. **Définir `CreationDataSource`**
   ```ts
   type CreationDataSource = {
     mode: "app" | "trial";
     useBrandProfile(): { data; isLoading };
     useBrandGuideline(): { data; isLoading };
     useBrandFonts(): { data; isLoading };
     useTemplates(): { data; isLoading };
     useCurrentPromotion(promotionId): { data; isLoading };
     saveVisual(payload): Promise<...>;     // no-op en trial
     uploadImage(file): Promise<{url}>;     // base64 dataURL en trial
     // panneau IA Gateway : autorisé dans les deux modes (LOVABLE_API_KEY est côté serveur)
   };
   ```

3. **Implémentation trial (`data-source-trial.ts`)**
   - Brand profile : objet par défaut (fonts Montserrat/Inter/Bebas Neue, couleurs neutres).
   - Templates : utilise `src/lib/promo-templates.ts` (déjà présent côté client).
   - Promotion courante : lue dans `useTunnelStore.detectedProducts` filtrée par `selected` (le tunnel marque les 3 sélectionnées en étape Sélection).
   - `saveVisual` : pousse un `TunnelPost` dans `useTunnelStore.generatedPosts` (déjà cappé à 3).
   - `uploadImage` : convertit le `File` en dataURL et le retourne.
   - Fonctionnalités serveur indisponibles (sauvegarde campagne, fonts custom uploadées) : panneaux affichés mais boutons remplacés par une bannière "Disponible après création du compte".

4. **Panneau file d'attente**
   - Nouveau composant `PromotionQueuePanel.tsx` : liste verticale des promotions sélectionnées avec coche verte, miniature, libellé.
   - Au clic : recharge le canvas avec les données de la promo (nom, prix, ancien prix, %, rayon, image) **sans réinitialiser** le template courant ni les déplacements/édits faits sur les blocs textuels génériques.
   - Stratégie : un "préset de remplissage" qui ne touche qu'aux blocs dont `role ∈ {title, price_main, price_old, badge}` + `bgImage`. Les `custom` et `elements` ajoutés manuellement restent intacts.
   - Sauvegarde de l'état par-promo (`Record<promoId, Config>`) en mémoire pour ne rien perdre quand on revient sur une promo précédente.
   - Sélection des promos :
     - **trial** : `useTunnelStore.detectedProducts.filter(selected)` (les 3 max).
     - **app** : `listCampaignItemsFn` (déjà appelée) — réutilisée tel quel.

5. **Préchargement automatique du canvas**
   - À l'ouverture, si une promotion est disponible, peupler les blocs (titre = nom, price_main, price_old, badge = `-X%`) et `bgImage = product.imageUrl ?? product.thumbnailUrl`.
   - Si template choisi en amont (`product.visualTemplate` ou template global du tunnel), l'appliquer.

6. **Navigation Précédent / Continuer (trial)**
   - Header dédié au-dessus de l'éditeur en mode trial : `← Précédent` (vers `/essai/selection`) et `Continuer →` (vers `/essai/publication`).
   - Le `WorkflowProgress` reste affiché (déjà géré par `essai.tsx` parent).
   - "Continuer" persiste le state courant via `useTunnelStore.setGeneratedPosts(...)`.

7. **Limites freemium**
   - Cap déjà géré : `setGeneratedPosts` slice à 3 dans `tunnel-store.ts`.
   - Pas d'autre verrou : tous les panneaux de l'éditeur restent utilisables.

8. **Suppression de l'ancien éditeur de tunnel**
   - Supprimer le contenu actuel de `essai.creation.tsx` (mockups Facebook/Instagram/LinkedIn) et le remplacer par le mount du nouveau composant.
   - Garder les composants `FacebookMockup`/`InstagramMockup`/`LinkedInMockup` pour `essai.publication.tsx` qui les utilise pour l'aperçu final (à confirmer en lisant ce fichier).

9. **Routes**
   - Pas de nouveau fichier de route, juste réécriture du composant de `essai.creation.tsx` et de `_authenticated/creation.tsx` pour qu'ils délèguent à `CreationEditor`.
   - Pas de migration Supabase nécessaire.

## Hors scope

- Pas de modification des autres étapes (Import/Analyse/Sélection/Publication) au-delà du wiring "Créer mes contenus" → `/essai/creation`, déjà en place.
- Pas de changement des server functions existantes.
- Pas de nouveaux secrets (LOVABLE_API_KEY déjà disponible côté serveur → l'IA gateway reste utilisable en trial via les server functions existantes, qui ne nécessitent pas d'auth).

## Risques / points d'attention

- **Régression sur `/creation` connecté** : c'est une grosse extraction. Mitigation : on conserve toutes les `useQuery` existantes, on les passe via le `dataSource` Supabase qui appelle les mêmes server fns. Aucun changement de comportement attendu pour les utilisateurs connectés.
- **Panneau de file d'attente côté connecté** : il existe déjà des `campaign-stepper`/`CampaignStepper` (importés dans `creation.tsx`). À harmoniser ou compléter — détails à trancher pendant l'implémentation.
- **Taille du diff** : ~2000 lignes touchées. Je procéderai en plusieurs commits logiques.
