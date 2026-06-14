# Refonte "Produit détouré" — éditeur type Canva

L'éditeur actuel traite le visuel du produit comme un fond figé (`bgImage`). Pour que le détourage devienne utile, le produit détouré doit devenir un **calque indépendant** transformable (déplacer / redimensionner / pivoter / réordonner), avec un CTA mis en avant et une toolbar contextuelle. Voici le plan d'implémentation.

## 1. Nouveau type de calque `ProductLayer`

Ajout dans `src/components/creation/CreationEditor.tsx` (type `Config`) :

```ts
type ProductLayer = {
  id: string;
  imageUrl: string;        // PNG détouré (transparent) ou image catalogue brute
  isCutout: boolean;       // true après suppression du fond
  x: number; y: number;    // % du canvas (centre)
  width: number;           // % du canvas
  height: number;          // % du canvas (calculé via ratio image)
  rotation: number;        // deg
  zIndex: number;
};
type Config = { ...; products: ProductLayer[]; ... }
```

Le champ `bgImage` reste pour le mode "fullbleed", mais dès qu'une image catalogue est détectée elle est désormais initialisée comme **un `ProductLayer`** centré à 70 % de largeur (plus comme fond).

## 2. CTA "Supprimer l'arrière-plan" mis en avant

Bande sticky au-dessus du canvas, visible uniquement si un `ProductLayer` non détouré est sélectionné :

```
[✨ Supprimer l'arrière-plan]   ← gradient Komaag, lg, shadow-glow
```

Suppression du bouton actuel discret dans le panneau "Importer".

## 3. Toolbar contextuelle flottante (style Canva)

Quand un `ProductLayer` est sélectionné, une barre flottante apparaît au-dessus de la bounding box avec :

- Supprimer l'arrière-plan (si pas encore détouré)
- Remplacer l'image (file picker)
- Recadrer (ouvre `CropModal` existant)
- Dupliquer
- Avant / Arrière (z-index)
- Supprimer

## 4. Poignées de transformation

Sur sélection : 8 poignées (4 coins + 4 latérales) + 1 poignée de rotation au-dessus.
Implémentation pointer-events maison (pas de lib externe) — drag pour déplacer, drag d'une poignée pour resize (avec maintien du ratio aux coins), rotation calculée via `atan2`. Snap auto-centre H/V (lignes guides).

## 5. Calques (layer system)

Panneau "Calques" dans la barre latérale listant dans l'ordre du fond vers l'avant :
Fond · Formes · Badges · **Produit** · Prix · Textes
Drag-and-drop simple pour réordonner. Chaque `ProductLayer` est rendu via `zIndex` CSS.

## 6. Palette de fonds unis (remplace les dégradés)

Refonte de `SOLID_PALETTE` :
- Couleur du catalogue (auto)
- Bleu catalogue U `#003DA5`
- Blanc, Noir
- Rouge promo `#dc2626`, Jaune promo `#facc15`
- Vert frais `#16a34a`
- Gris premium `#374151`

La 1ère case = couleur dominante détectée (`extractDominantColor` existant) ; pré-sélectionnée par défaut au chargement du produit.

## 7. Persistance des transformations

`CreativeState` (dans `src/lib/tunnel-store.ts`) reçoit `products: ProductLayer[]`. Sauvegarde auto à chaque modif via `setCreativeState`. Lecture lors du retour Création → Validation → Publication : l'image finale est exportée via `toPng` du canvas (déjà en place), conservant tous les calques et transformations.

## 8. Détourage = transformation du `ProductLayer` actif

`removeBackgroundFromCurrentImage` (déjà présent) est adapté : au lieu d'écrire dans `config.bgImage`, il met à jour le `ProductLayer` sélectionné (`imageUrl = dataUrl`, `isCutout = true`). Le fond derrière redevient `bgColor` choisi.

## Fichiers modifiés

- `src/components/creation/CreationEditor.tsx` — gros refactor canvas + toolbar + handles + layers panel + palette
- `src/lib/tunnel-store.ts` — ajout `products` dans `CreativeState`
- (aucune migration DB : tout est stocké côté client / dans `creative_state` JSON existant)

## Hors scope

- Templates d'enseigne (déjà prévus, juste consommeront `bgColor` indépendamment du produit)
- Génération IA d'image (inchangée)
- Drag-and-drop multi-sélection (V2)

Aucune ambiguïté restante — j'implémente directement après validation du plan.
