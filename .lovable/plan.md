# Workflow unifié Komaag — 5 étapes partagées

## Objectif
Un seul workflow, une seule barre de progression, mêmes écrans, mêmes CTA — peu importe si l'utilisateur est dans `/essai` (anonyme) ou dans `/app` (connecté). La seule différence : à l'étape **Publication**, l'anonyme voit le `TrialGateModal` avant publish/programme/sauvegarde.

## Les 5 étapes (canoniques)

```text
1. Import      → upload PDF/JPG/PNG, aperçu, "Analyser"
2. Analyse     → progression IA, promos/produits/prix/visuels détectés, "Continuer"
3. Sélection   → grille promos (miniature, produit, prix, remise, rayon), filtres + sélection, "Créer mes contenus"
4. Création    → éditeur Canva existant, préchargé depuis la sélection, "Valider"
5. Publication → calendrier/date/heure/réseau, "Programmer / Publier / Brouillon"
```

## Architecture cible

### Composants partagés (nouveaux, sous `src/components/workflow/`)
- `WorkflowProgress.tsx` — barre 5 étapes, remplace `TunnelProgress` et `CampaignStepper`. Props : `active: WorkflowStep`, `mode: "trial" | "app"`. Adapte les `to` selon le mode (`/essai/...` vs `/app/...`).
- `ImportStep.tsx` — drag&drop, aperçu, validation, CTA "Analyser". Extrait depuis `essai.import.tsx`.
- `AnalyseStep.tsx` — progression + listes détectées + CTA "Continuer". Extrait depuis `essai.analyse.tsx`.
- `SelectionStep.tsx` — grille promos sélectionnables avec filtres. NOUVEAU (remplace l'aperçu pré-formaté de `essai.preview.tsx`).
- `PublicationStep.tsx` — calendrier + CTA programmer/publier/brouillon. Réutilise `ScheduleItemModal` et la logique de `essai.schedule.tsx` / `calendar.tsx`.

Chaque composant reçoit un `mode: "trial" | "app"` + des callbacks (`onNext`, `onPublishGate`).

### Store partagé
- Renommer/étendre `useTunnelStore` en `useWorkflowStore` (`src/lib/workflow-store.ts`) avec la séquence à 5 étapes (`import | analyse | selection | creation | publication`).
- En mode connecté, le store reste utile comme buffer client (sélection en cours) avant persistance via les server functions existantes (`catalog.functions.ts`, `promotions.functions.ts`, `campaigns.functions.ts`).

### Routes tunnel (anonyme)
Restructurer en miroir des 5 étapes :
- `src/routes/essai.import.tsx` — utilise `<ImportStep mode="trial" />`
- `src/routes/essai.analyse.tsx` — `<AnalyseStep mode="trial" />`
- `src/routes/essai.selection.tsx` — **NOUVEAU**, `<SelectionStep mode="trial" />`
- `src/routes/essai.creation.tsx` — **NOUVEAU**, monte l'éditeur de `creation.tsx` en mode léger (sans auth)
- `src/routes/essai.publication.tsx` — `<PublicationStep mode="trial" onPublishGate={openTrialModal} />`
- Supprimer : `essai.preview.tsx`, `essai.schedule.tsx` (remplacés).

### Routes app (connectée)
Nouveau parcours linéaire qui réutilise les mêmes composants :
- `src/routes/_authenticated/workflow.import.tsx`
- `src/routes/_authenticated/workflow.analyse.tsx`
- `src/routes/_authenticated/workflow.selection.tsx`
- `src/routes/_authenticated/workflow.creation.tsx` — délègue à l'éditeur existant `creation.tsx`
- `src/routes/_authenticated/workflow.publication.tsx`

L'entrée se fait depuis `dashboard.tsx` (CTA "Nouveau contenu") ou `catalog.tsx` (CTA "Créer depuis ce catalogue").

Les écrans existants `catalog`, `promotions`, `creation`, `calendar` restent accessibles indépendamment (vues de gestion), mais le workflow guidé passe désormais par `/app/workflow/*`.

### Gate compte (tunnel uniquement)
Dans `PublicationStep` avec `mode="trial"`, tout clic sur Publier / Programmer / Brouillon déclenche `TrialGateModal` au lieu d'exécuter l'action. Aucune autre étape ne demande de compte.

### Barre de progression
- Remplacer dans `essai.tsx` l'import `TunnelProgress` → `WorkflowProgress mode="trial"`.
- Ajouter dans le layout `/app/workflow/*` un header avec `WorkflowProgress mode="app"`.
- Supprimer `CampaignStepper` (non utilisé après unification) ou le garder uniquement si une autre vue en dépend (à vérifier).

## Hors-scope
- Pas de refonte de l'éditeur Création (déjà fait à l'itération précédente).
- Pas de modification du schéma DB.
- Pas de logique IA réelle nouvelle.

## Fichiers créés
- `src/lib/workflow-store.ts`
- `src/components/workflow/WorkflowProgress.tsx`
- `src/components/workflow/ImportStep.tsx`
- `src/components/workflow/AnalyseStep.tsx`
- `src/components/workflow/SelectionStep.tsx`
- `src/components/workflow/PublicationStep.tsx`
- `src/routes/essai.selection.tsx`
- `src/routes/essai.creation.tsx`
- `src/routes/essai.publication.tsx`
- `src/routes/_authenticated/workflow.tsx` (layout)
- `src/routes/_authenticated/workflow.import.tsx`
- `src/routes/_authenticated/workflow.analyse.tsx`
- `src/routes/_authenticated/workflow.selection.tsx`
- `src/routes/_authenticated/workflow.creation.tsx`
- `src/routes/_authenticated/workflow.publication.tsx`

## Fichiers modifiés
- `src/routes/essai.tsx` — utiliser `WorkflowProgress`
- `src/routes/essai.import.tsx` / `essai.analyse.tsx` — remonter sur les composants partagés
- `src/components/app-sidebar.tsx` — entrée "Nouveau contenu" → `/workflow/import`
- `src/routes/_authenticated/dashboard.tsx` — CTA principal vers le workflow

## Fichiers supprimés
- `src/routes/essai.preview.tsx`
- `src/routes/essai.schedule.tsx`
- `src/components/tunnel-progress.tsx`
- `src/components/campaign-stepper.tsx` (si non utilisé ailleurs)

## Validation
- Parcourir `/essai/import` → `/essai/publication` et vérifier que la modale apparaît uniquement à l'étape 5.
- Parcourir `/workflow/import` → `/workflow/publication` connecté, vérifier la persistance.
- Vérifier que la barre de progression affiche bien 5 étapes dans les deux modes.
