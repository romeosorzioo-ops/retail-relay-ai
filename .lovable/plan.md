# Refonte module Création — style Canva spécialisé

## Objectif
Transformer `/creation` en éditeur visuel moderne type Canva, sans toucher à la logique métier existante (blocks, templates, promotions, save, scheduling, IA). Refonte **UI uniquement**.

## Nouvelle structure

```text
┌──────────────────────────────────────────────────────────┐
│ TopBar : [Nom visuel]  [Format ▾]   [⬇][📅][Publier]    │
├────┬────────────────┬──────────────────────────────┬─────┤
│ N  │ Panneau        │                              │ N   │
│ a  │ contextuel     │      Canvas (grand)          │ a   │
│ v  │ (selon item    │      zoom + pan              │ v   │
│    │  cliqué)       │                              │     │
└────┴────────────────┴──────────────────────────────┴─────┘
```

### 1. Sidebar gauche verticale (fixe, ~80px)
6 items icône + libellé, fond sombre, hover léger, item actif avec dégradé Komaag (`#ff66c4 → #ffde59`).
- **Modèles** (LayoutTemplate)
- **Texte** (Type)
- **Éléments** (Shapes)
- **Importer** (Upload)
- **Marque** (Palette) — auto-rempli depuis brand profile
- **Outils IA** (Sparkles)

### 2. Panneau contextuel (~280px, slide)
Contenu selon item actif :
- **Modèles** : grille de cartes (templates enseigne : Jeudi PLUS, Arrivage, Producteur local, Catalogue semaine) → réutilise `listVisualTemplatesFn`
- **Texte** : bouton "Ajouter un paragraphe" + presets (Titre promo, Prix, Ancien prix barré) → crée des Blocks avec rôles existants
- **Éléments** : bibliothèque `GRAPHIC_ELEMENTS` (flèches, pastilles %, formes, stickers, séparateurs) groupée par `ELEMENT_CATEGORIES`
- **Importer** : drop-zone (image/logo/PNG/SVG) → réutilise `uploadVisualImageFn`
- **Marque** : logo enseigne, palette couleurs, polices (depuis `getMyBrandProfileFn` + `getMyBrandGuidelineFn` + `listBrandFontsFn`)
- **Outils IA** : Générer image produit, Supprimer fond, Améliorer photo, Recentrer, Générer texte, Variantes

### 3. Canvas central
- Plus grand (occupe tout l'espace dispo, padding réduit)
- Conserve le moteur de rendu actuel (blocks/elements/template)
- Ajouter contrôles zoom (+/-, %) en bas
- Sélection multiple : déjà présente ou marquée TODO si absente

### 4. Top bar
- Gauche : input éditable nom du visuel
- Centre : Select format (POST_FORMATS)
- Droite : `Télécharger` (toPng existant), `Planifier` (ScheduleItemModal), `Publier` (bouton dégradé Komaag principal)

### 5. Panneau droit (propriétés)
Reste affiché quand un block/élément est sélectionné (props existantes : font, taille, couleur, alignement, stroke, shadow). Sinon caché → plus de place pour le canvas.

## Implémentation
- **Pas de réécriture** des fonctions métier ni du moteur de rendu blocks/elements.
- Restructurer `src/routes/_authenticated/creation.tsx` : extraire la sidebar gauche, le panneau contextuel et la top bar en composants dédiés sous `src/components/creation/`.
- Mapper l'ancien `Tabs` (props/elements/templates/link) vers la nouvelle nav latérale : "Bloc" devient le panneau droit (propriétés), "Éléments"/"Modèles" deviennent des items sidebar, "Promo" (link) devient un sous-section dans panneau Marque ou Modèles.
- Conserver toute la logique de chargement (promotions, campaign items, brand profile).
- Ajouter le dégradé Komaag comme classe utilitaire dans `src/styles.css` si pas déjà présent.

## Hors-scope
- Pas de nouvelles fonctionnalités IA réelles (les boutons "Outils IA" déclenchent les fonctions déjà existantes ou affichent un placeholder "Bientôt").
- Pas de changement de schéma DB.
- Pas de modif du tunnel d'essai.

## Fichiers à créer
- `src/components/creation/CreationSidebar.tsx`
- `src/components/creation/CreationTopBar.tsx`
- `src/components/creation/panels/TemplatesPanel.tsx`
- `src/components/creation/panels/TextPanel.tsx`
- `src/components/creation/panels/ElementsPanel.tsx`
- `src/components/creation/panels/ImportPanel.tsx`
- `src/components/creation/panels/BrandPanel.tsx`
- `src/components/creation/panels/AiToolsPanel.tsx`

## Fichiers à modifier
- `src/routes/_authenticated/creation.tsx` (recomposition du layout, conservation de toute la logique d'état/handlers)
- `src/styles.css` (utilitaire `bg-komaag-gradient` si absent)

## Validation
Vérifier visuellement chaque panneau via le preview, et que les fonctions Save / Download / Schedule fonctionnent toujours.
