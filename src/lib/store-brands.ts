// Liste canonique des enseignes supportées par l'application.
// Utilisée par le profil magasin, l'admin des chartes graphiques et le
// filtrage des ressources (templates, polices, charte) dans le module
// Création.
export const STORE_BRANDS = [
  "Super U",
  "U Express",
  "Hyper U",
  "Intermarché",
  "Carrefour Market",
  "Carrefour Contact",
  "Carrefour City",
  "Auchan",
  "Spar",
  "Casino",
  "Biocoop",
  "Autre",
] as const;

export type StoreBrand = (typeof STORE_BRANDS)[number];
