# Refonte module Détourage — éditeur type Canva

Gros refactor de `src/components/creation/CreationEditor.tsx` (~2500 lignes) et `src/lib/tunnel-store.ts`. Pas de migration DB.

## 1. Réorganisation menu latéral

Nouvel ordre des onglets :
1. **Détourage** (nouveau, action principale)
2. Texte
3. Éléments (fusionne ancien "Modèles" + éléments graphiques)
4. Importer
5. Marque
6. Outils IA

Suppression de l'onglet "Modèles" — sa grille de templates est déplacée dans une section "Modèles d'enseigne" en haut de l'onglet Éléments.

## 2. Nouvel onglet "Détourage"

Panneau dédié avec 4 actions empilées (boutons larges, icônes) :
- ✨ **Supprimer l'arrière-plan** (IA)
- ↩️ Restaurer l'image originale
- 🪄 Ouvrir la gomme magique
- 🔄 Réinitialiser les retouches

## 3. Logique bouton « Supprimer l'arrière-plan »

```ts
if (selectedLayer.isCutout) openMagicEraser();
else runBackgroundRemoval();
```
Même bouton dans la toolbar contextuelle flottante.

## 4–5. Gomme Magique (modal plein écran)

Nouveau composant `MagicEraser.tsx` (canvas HTML5 dédié) :
- **Mode Effacer** : peint en transparence sur une mask layer.
- **Mode Restaurer** : repeint l'opacité originale via la mask layer.
- Contrôles : taille pinceau (1–200px), dureté (0–100%), opacité (0–100%), toggle « Afficher l'original » (overlay 50%), bouton Reset.
- Sauvegarde : la mask finale est appliquée via `canvas.globalCompositeOperation = 'destination-out'` pour produire un PNG transparent stocké dans `ProductLayer.imageUrl`. L'image **originale détourée** est conservée séparément (`originalCutoutUrl`) pour permettre Reset/Restore.

## 6. Zoom automatique

À l'ouverture de l'onglet Détourage ou de la gomme :
- calcule bbox du produit sélectionné
- applique `zoom = clamp(canvasSize / bboxSize * 0.8, 1.5, 3.0)`
- centre la vue sur le produit (pan)
- pan libre activé (drag avec espace ou outil main)

État `viewport: { zoom, panX, panY }` dans `CreationEditor`.

## 7. Produit libre + transformations

Ajouts à la toolbar contextuelle :
- Pivoter (déjà présent via handle)
- 🔁 Retourner horizontalement (`scaleX *= -1`)
- 🔃 Retourner verticalement (`scaleY *= -1`)

Nouveau champs `ProductLayer.scaleX/scaleY` (±1).

## 8. Recadrage sans limite

Suppression des `clamp(0, 100)` sur les poignées de redimensionnement et déplacement. Le produit peut sortir du canvas. Le canvas conserve `overflow: visible` pour l'aperçu, et l'export `toPng` continue d'utiliser le seul `<div ref={canvasRef}>` qui clip naturellement la zone exportée.

## 9. Ordre des calques

Toolbar contextuelle + raccourcis clavier :
- Premier plan : `zIndex = max + 1`
- Avancer : `zIndex += 1` (swap voisin)
- Reculer : `zIndex -= 1`
- Arrière-plan : `zIndex = min - 1`

Fonctionne entre produits, textes et badges (tous reçoivent un `zIndex`).

## 10. Historique Undo/Redo

Stack `history: Config[]` + `historyIndex`. Push à chaque mutation (debounce 300 ms). Raccourcis ⌘Z / ⌘⇧Z. Boutons dans la barre supérieure.

Couvre : détourage, gomme, déplacement, rotation, resize, flip, reorder.

## 11. Persistance

Ajout dans `PersistedProductLayer` :
- `scaleX`, `scaleY`
- `originalCutoutUrl` (image avant gomme, pour Reset)
- `maskDataUrl` (mask de la gomme, pour ré-éditer ultérieurement)

Les data URLs lourdes (mask + original) sont **stripées du localStorage** comme déjà fait pour `imageUrl`, et conservées en mémoire pendant la session. Persistance fiable : position, rotation, échelle, flips, zIndex.

## Fichiers

- `src/components/creation/CreationEditor.tsx` — refactor majeur (panneaux, toolbar, zoom, undo, suppression clamps)
- `src/components/creation/MagicEraser.tsx` — **nouveau** (modal canvas + brush)
- `src/components/creation/useHistory.ts` — **nouveau** hook undo/redo générique
- `src/lib/tunnel-store.ts` — ajout `scaleX/Y` et champs gomme dans `PersistedProductLayer`

## Hors scope

- Détection auto multi-produits (V2)
- Détourage par couleur / baguette magique (V2)
- Export multi-format avec éléments hors canvas (l'export reste cadré sur le canvas)
