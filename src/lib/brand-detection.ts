// Shared list of known brands used for both client-side warning and server-side guard.
export const KNOWN_BRANDS = [
  "coca-cola", "coca cola", "pepsi", "pringles", "nutella", "huggies", "pampers",
  "danone", "nestle", "nestlé", "kinder", "ferrero", "oreo", "lay's", "lays",
  "haribo", "lu", "président", "president", "lactel", "evian", "perrier",
  "heineken", "kronenbourg", "1664", "ricard", "absolut", "jack daniel",
  "kellogg", "milka", "lindt", "bonduelle", "knorr", "maggi", "barilla",
  "panzani", "activia", "yoplait", "saint-michel",
];

export function isBrandedProduct(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return KNOWN_BRANDS.some((b) => lower.includes(b));
}
