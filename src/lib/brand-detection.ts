// Shared classifier: distinguishes packaged products (must use catalog image)
// from fresh/generic products (can be AI-generated when no catalog image).

export const KNOWN_BRANDS = [
  "coca-cola", "coca cola", "pepsi", "pringles", "nutella", "huggies", "pampers",
  "danone", "nestle", "nestlé", "kinder", "ferrero", "oreo", "lay's", "lays",
  "haribo", "lu", "président", "president", "lactel", "evian", "perrier",
  "heineken", "kronenbourg", "1664", "ricard", "absolut", "jack daniel",
  "kellogg", "milka", "lindt", "bonduelle", "knorr", "maggi", "barilla",
  "panzani", "activia", "yoplait", "saint-michel", "apéricube", "apericube",
  "danette", "babybel", "vache qui rit", "elle & vire", "fanta", "sprite",
  "orangina", "schweppes", "red bull", "monster", "tropicana",
];

// Indicateurs de packaging générique sans marque (boîte, bouteille, paquet...).
const PACKAGED_HINTS = [
  "boîte", "boite", "bouteille", "canette", "pack", "paquet", "sachet",
  "bocal", "conserve", "berlingot", "brique", "tablette", "barre", "capsule",
  "dosette", "flacon", "tube", "pot de", "yaourt", "compote", "céréales", "cereales",
  "biscuit", "chips", "soda", "jus de", "lait", "café", "cafe", "thé ", "the ",
  "pâtes", "pates", "riz ", "huile", "vinaigre", "sauce", "ketchup", "mayonnaise",
  "moutarde", "confiture", "miel", "chocolat", "bonbon", "glace", "surgelé",
  "surgele", "pizza", "lessive", "shampoing", "dentifrice", "savon", "couche",
];

// Produits frais / vrac / découpe — pas de packaging identifiable.
const FRESH_KEYWORDS = [
  "fraise", "framboise", "myrtille", "cerise", "raisin", "pomme", "poire",
  "banane", "orange", "citron", "pêche", "peche", "abricot", "prune", "kiwi",
  "ananas", "mangue", "melon", "pastèque", "pasteque", "tomate", "courgette",
  "aubergine", "poivron", "carotte", "pomme de terre", "patate", "oignon",
  "ail", "échalote", "echalote", "salade", "laitue", "épinard", "epinard",
  "chou", "brocoli", "concombre", "radis", "champignon", "haricot", "petit pois",
  "céleri", "celeri", "poireau", "navet", "betterave", "asperge", "artichaut",
  "avocat", "fenouil",
  "viande", "boeuf", "bœuf", "porc", "agneau", "veau", "poulet", "dinde",
  "canard", "rôti", "roti", "steak", "côte de", "cote de", "escalope",
  "filet de", "saucisse", "merguez", "jambon à la coupe", "jambon a la coupe",
  "poisson", "saumon", "thon", "cabillaud", "merlu", "dorade", "bar",
  "crevette", "moules", "huîtres", "huitres", "coquille", "noix de saint",
  "fromage à la coupe", "fromage a la coupe", "fromage coupe", "à la coupe",
  "a la coupe", "vrac", "pain", "baguette", "viennoiserie", "croissant",
];

export function isBrandedProduct(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return KNOWN_BRANDS.some((b) => lower.includes(b));
}

export type ProductType = "packaged" | "fresh";

/**
 * Classifie un produit en "packaged" (packaging identifiable → image catalogue obligatoire,
 * jamais d'IA) ou "fresh" (frais/générique → génération IA autorisée si pas d'image catalogue).
 *
 * Heuristique :
 *  - marque connue → packaged
 *  - mot-clé de packaging (boîte, bouteille, sachet…) → packaged
 *  - mot-clé frais (fraise, courgette, viande, à la coupe…) → fresh
 *  - défaut → packaged (on n'invente pas un visuel quand on n'est pas sûr)
 */
export function classifyProductType(
  name?: string | null,
  category?: string | null,
): ProductType {
  if (!name) return "packaged";
  const text = `${name} ${category ?? ""}`.toLowerCase();
  if (KNOWN_BRANDS.some((b) => text.includes(b))) return "packaged";
  if (FRESH_KEYWORDS.some((k) => text.includes(k))) return "fresh";
  if (PACKAGED_HINTS.some((h) => text.includes(h))) return "packaged";
  return "packaged";
}
