
# Refonte typographique du module Création

Gros chantier — je propose un plan en 4 lots livrables, à valider avant code.

## Lot 1 — Bibliothèque de polices Google + chargement global

- Charger via Google Fonts (lien `<link>` injecté dans `__root.tsx`) les 10 polices : Montserrat, Poppins, Oswald, Bebas Neue, Anton, Roboto, Open Sans, Inter, League Spartan, Playfair Display.
- Créer `src/lib/fonts.ts` exportant `FONT_LIBRARY` (nom + family + poids dispos) utilisé partout (creation + store).
- Sélecteurs de police affichant le nom dans sa propre fonte (preview).

## Lot 2 — Identité visuelle magasin (3 polices)

- Migration : ajouter `font_primary`, `font_secondary`, `font_price` à `brand_profiles` (le champ `font_family` existant devient `font_primary`).
- Étendre `src/lib/brand-profiles.functions.ts` (schema + payload).
- UI `store.tsx` : 3 sélecteurs (police principale / secondaire / prix) + bibliothèque uploadée existante réutilisable pour chacun.
- Upload de polices par magasin : table `brand_fonts` (id, store_id, user_id, name, url, format, created_at) + bucket existant `promotion-files`.
  - Server fn `listBrandFontsFn`, `uploadBrandFontFn`, `deleteBrandFontFn`.
  - Section "Bibliothèque de polices" dans `store.tsx` : liste + upload TTF/OTF/WOFF/WOFF2 (10 Mo max).
  - Toutes les polices uploadées sont enregistrées via `FontFace` côté création.

## Lot 3 — Blocs de texte indépendants + composant Prix

Refonte du modèle `config_json` dans `creation.tsx` : passer d'un schéma "champs" à un schéma "blocs" :

```ts
type TextBlock = {
  id: string;
  role: 'title' | 'subtitle' | 'price_main' | 'price_old' | 'badge' | 'custom';
  text: string;
  x: number; y: number; // % ou px
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean;
  stroke?: { color: string; width: number };
  shadow?: { color: string; x: number; y: number; blur: number };
}
type PriceBlock = TextBlock & {
  role: 'price_main' | 'price_old';
  strikethrough?: boolean;
};
```

UI :
- Panneau latéral droit "Propriétés du bloc sélectionné" avec tous les contrôles (font, taille, couleur, B/I/U/S, contour, ombre).
- Cliquer sur un bloc dans le canvas le sélectionne.
- Boutons "Ajouter titre / sous-titre / prix / badge / texte libre" (préremplis avec l'identité visuelle).
- Composant `PriceGroup` regroupant `price_old` (barré, gris, police secondaire) + `price_main` (gras, couleur primaire, police prix).

## Lot 4 — Templates dynamiques

- Le `config_json` sérialise déjà tous les blocs → templates réutilisables tels quels.
- Bouton "Enregistrer comme template" sur la page création (insère dans `visual_templates` avec le `config_json` complet).
- Pré-remplissage : à l'ouverture d'un template, les polices/couleurs/slogan/logo viennent du brand profile si absents.

## Notes techniques

- Rendu canvas actuel à inspecter (`creation.tsx`) pour adapter le moteur de rendu aux nouveaux blocs — j'utiliserai du DOM absolument positionné (overlay sur l'image de fond) plutôt qu'un vrai `<canvas>` pour rester simple et exportable via html-to-image déjà probablement présent.
- Export PNG via `html-to-image` (ajout si nécessaire).
- Migrations : 1 pour `brand_profiles` (3 polices) + 1 pour `brand_fonts`.

## Question

Tu confirmes que je peux **remplacer** le schéma actuel `config_json` de la page création par le nouveau modèle de blocs (les visuels existants déjà sauvegardés resteront lisibles mais affichés en mode legacy minimal) ? Sinon je dois faire un mode dual + migration de données — plus long.
