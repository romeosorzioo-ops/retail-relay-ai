// Bibliothèque d'éléments graphiques (flèches, badges, formes)
// Chaque élément expose un SVG paramétrable via (color, strokeWidth, secondary).
// Les SVG utilisent viewBox "0 0 100 100" sauf indication.

export type ElementCategory = "arrow" | "badge" | "shape";

export type GraphicElementDef = {
  key: string;
  name: string;
  category: ElementCategory;
  defaultColor: string;
  defaultStroke: number; // épaisseur "logique" sur viewBox 100
  defaultSecondary?: string;
  // svg : renvoie le contenu intérieur (sans <svg> wrapper)
  svg: (opts: { color: string; stroke: number; secondary?: string }) => string;
  viewBox?: string;
  defaultRatio?: number; // width/height ratio, default 1
};

const stroke = (s: number) => Math.max(0.5, s);

/* =========================
   FLÈCHES
   ========================= */
const arrows: GraphicElementDef[] = [
  {
    key: "arrow_curved_modern", name: "Flèche courbée moderne", category: "arrow",
    defaultColor: "#111111", defaultStroke: 6, defaultRatio: 1.4,
    svg: ({ color, stroke: s }) => `
      <path d="M10 70 C 30 20, 70 20, 90 55" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
      <path d="M90 55 L82 45 M90 55 L78 60" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  {
    key: "arrow_curved_thin", name: "Flèche courbée fine", category: "arrow",
    defaultColor: "#111111", defaultStroke: 2, defaultRatio: 1.4,
    svg: ({ color, stroke: s }) => `
      <path d="M5 80 C 25 30, 70 25, 92 60" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
      <path d="M92 60 L82 50 M92 60 L78 65" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  {
    key: "arrow_sketch_white", name: "Flèche sketch blanche", category: "arrow",
    defaultColor: "#ffffff", defaultStroke: 5, defaultRatio: 1.5,
    svg: ({ color, stroke: s }) => `
      <path d="M8 75 q 20 -30 45 -25 q 15 3 35 -15" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M88 35 l-12 -3 m12 3 l-3 12" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
    `,
  },
  {
    key: "arrow_sketch_black", name: "Flèche sketch noire", category: "arrow",
    defaultColor: "#111111", defaultStroke: 5, defaultRatio: 1.5,
    svg: ({ color, stroke: s }) => `
      <path d="M10 70 q 15 -25 40 -20 q 18 3 38 -18" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M88 32 l-13 -2 m13 2 l-2 13" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
    `,
  },
  {
    key: "arrow_circular", name: "Flèche circulaire", category: "arrow",
    defaultColor: "#111111", defaultStroke: 5,
    svg: ({ color, stroke: s }) => `
      <path d="M85 50 A35 35 0 1 0 50 85" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
      <path d="M50 85 L40 78 M50 85 L46 95" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  {
    key: "arrow_promo", name: "Flèche promotion", category: "arrow",
    defaultColor: "#E11D48", defaultStroke: 0, defaultRatio: 2,
    svg: ({ color }) => `
      <path d="M5 35 L70 35 L70 20 L95 50 L70 80 L70 65 L5 65 Z" fill="${color}"/>
    `,
  },
  {
    key: "arrow_double", name: "Double flèche", category: "arrow",
    defaultColor: "#111111", defaultStroke: 6, defaultRatio: 2,
    svg: ({ color, stroke: s }) => `
      <path d="M15 50 L85 50" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
      <path d="M15 50 L25 40 M15 50 L25 60" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" fill="none"/>
      <path d="M85 50 L75 40 M85 50 L75 60" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" fill="none"/>
    `,
  },
  {
    key: "arrow_handwritten", name: "Flèche manuscrite", category: "arrow",
    defaultColor: "#111111", defaultStroke: 4, defaultRatio: 1.6,
    svg: ({ color, stroke: s }) => `
      <path d="M8 78 C 20 60, 35 55, 50 60 S 75 70, 85 40" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
      <path d="M85 40 L75 38 M85 40 L83 50" fill="none" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round"/>
    `,
  },
  {
    key: "arrow_dashed", name: "Flèche pointillée", category: "arrow",
    defaultColor: "#111111", defaultStroke: 5, defaultRatio: 2,
    svg: ({ color, stroke: s }) => `
      <path d="M5 50 L85 50" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" stroke-dasharray="2 8" fill="none"/>
      <path d="M85 50 L72 40 M85 50 L72 60" stroke="${color}" stroke-width="${stroke(s)}" stroke-linecap="round" fill="none"/>
    `,
  },
  {
    key: "arrow_dynamic", name: "Flèche dynamique", category: "arrow",
    defaultColor: "#E11D48", defaultStroke: 0, defaultRatio: 2,
    svg: ({ color }) => `
      <path d="M5 60 L40 60 L35 30 L95 50 L40 80 L45 60 Z" fill="${color}"/>
    `,
  },
];

/* =========================
   BADGES PROMO
   ========================= */
function starburst(color: string, text: string, sub?: string, textColor = "#ffffff") {
  // étoile à 12 pointes
  const points: string[] = [];
  const cx = 50, cy = 50;
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 48 : 38;
    const a = (i * Math.PI) / 12 - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `
    <polygon points="${points.join(" ")}" fill="${color}"/>
    <text x="50" y="${sub ? 48 : 56}" text-anchor="middle" font-family="Impact, Bebas Neue, sans-serif" font-size="${sub ? 14 : 18}" font-weight="900" fill="${textColor}">${text}</text>
    ${sub ? `<text x="50" y="62" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="700" fill="${textColor}">${sub}</text>` : ""}
  `;
}
function ribbon(color: string, text: string, sub?: string) {
  return `
    <path d="M5 30 L95 30 L88 50 L95 70 L5 70 L12 50 Z" fill="${color}"/>
    <text x="50" y="${sub ? 48 : 56}" text-anchor="middle" font-family="Impact, Bebas Neue, sans-serif" font-size="${sub ? 12 : 16}" font-weight="900" fill="#ffffff">${text}</text>
    ${sub ? `<text x="50" y="62" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#ffffff">${sub}</text>` : ""}
  `;
}

const badges: GraphicElementDef[] = [
  { key: "badge_prix_choc",    name: "Prix choc",          category: "badge", defaultColor: "#E11D48", defaultStroke: 0,
    svg: ({ color }) => starburst(color, "PRIX", "CHOC") },
  { key: "badge_remise_immediate", name: "Remise immédiate", category: "badge", defaultColor: "#F59E0B", defaultStroke: 0,
    svg: ({ color }) => starburst(color, "REMISE", "IMMÉDIATE") },
  { key: "badge_offre_speciale", name: "Offre spéciale", category: "badge", defaultColor: "#2563EB", defaultStroke: 0, defaultRatio: 2,
    svg: ({ color }) => ribbon(color, "OFFRE", "SPÉCIALE") },
  { key: "badge_nouveau", name: "Nouveau", category: "badge", defaultColor: "#16A34A", defaultStroke: 0,
    svg: ({ color }) => starburst(color, "NOUVEAU") },
  { key: "badge_produit_local", name: "Produit local", category: "badge", defaultColor: "#15803D", defaultStroke: 0,
    svg: ({ color }) => starburst(color, "PRODUIT", "LOCAL") },
  { key: "badge_coup_de_coeur", name: "Coup de cœur", category: "badge", defaultColor: "#DC2626", defaultStroke: 0,
    svg: ({ color }) => `
      <path d="M50 85 C 20 65, 10 45, 25 30 C 35 20, 45 25, 50 35 C 55 25, 65 20, 75 30 C 90 45, 80 65, 50 85 Z" fill="${color}"/>
      <text x="50" y="55" text-anchor="middle" font-family="Impact, Bebas Neue, sans-serif" font-size="11" font-weight="900" fill="#ffffff">COUP DE</text>
      <text x="50" y="68" text-anchor="middle" font-family="Impact, Bebas Neue, sans-serif" font-size="11" font-weight="900" fill="#ffffff">CŒUR</text>
    `,
  },
  { key: "badge_promo_weekend", name: "Promotion week-end", category: "badge", defaultColor: "#7C3AED", defaultStroke: 0, defaultRatio: 2,
    svg: ({ color }) => ribbon(color, "PROMO", "WEEK-END") },
];

/* =========================
   FORMES
   ========================= */
const shapes: GraphicElementDef[] = [
  { key: "shape_circle", name: "Cercle", category: "shape", defaultColor: "#E11D48", defaultStroke: 0,
    svg: ({ color, stroke: s, secondary }) => s > 0
      ? `<circle cx="50" cy="50" r="${48 - s / 2}" fill="${secondary ?? "none"}" stroke="${color}" stroke-width="${s}"/>`
      : `<circle cx="50" cy="50" r="48" fill="${color}"/>`,
  },
  { key: "shape_rect", name: "Rectangle", category: "shape", defaultColor: "#2563EB", defaultStroke: 0, defaultRatio: 1.6,
    svg: ({ color, stroke: s, secondary }) => s > 0
      ? `<rect x="${2 + s / 2}" y="${2 + s / 2}" width="${96 - s}" height="${96 - s}" fill="${secondary ?? "none"}" stroke="${color}" stroke-width="${s}"/>`
      : `<rect x="2" y="2" width="96" height="96" fill="${color}"/>`,
  },
  { key: "shape_rect_rounded", name: "Rectangle arrondi", category: "shape", defaultColor: "#16A34A", defaultStroke: 0, defaultRatio: 1.6,
    svg: ({ color, stroke: s, secondary }) => s > 0
      ? `<rect x="${2 + s / 2}" y="${2 + s / 2}" width="${96 - s}" height="${96 - s}" rx="14" fill="${secondary ?? "none"}" stroke="${color}" stroke-width="${s}"/>`
      : `<rect x="2" y="2" width="96" height="96" rx="14" fill="${color}"/>`,
  },
  { key: "shape_speech", name: "Bulle promotion", category: "shape", defaultColor: "#FACC15", defaultStroke: 0, defaultRatio: 1.2,
    svg: ({ color }) => `
      <path d="M10 15 H90 a8 8 0 0 1 8 8 v45 a8 8 0 0 1 -8 8 H40 L25 92 L28 76 H10 a8 8 0 0 1 -8 -8 V23 a8 8 0 0 1 8 -8 Z" fill="${color}"/>
    `,
  },
  { key: "shape_price_tag", name: "Étiquette prix", category: "shape", defaultColor: "#DC2626", defaultStroke: 0, defaultRatio: 1.8,
    svg: ({ color }) => `
      <path d="M5 50 L25 15 H92 a3 3 0 0 1 3 3 V82 a3 3 0 0 1 -3 3 H25 Z" fill="${color}"/>
      <circle cx="20" cy="50" r="5" fill="#ffffff"/>
    `,
  },
];

export const GRAPHIC_ELEMENTS: GraphicElementDef[] = [...arrows, ...badges, ...shapes];

export const ELEMENT_CATEGORIES: { key: ElementCategory; label: string }[] = [
  { key: "arrow", label: "Flèches" },
  { key: "badge", label: "Badges promo" },
  { key: "shape", label: "Formes" },
];

export function getElementDef(key: string): GraphicElementDef | undefined {
  return GRAPHIC_ELEMENTS.find((e) => e.key === key);
}

export function renderElementSvg(
  key: string,
  opts: { color: string; stroke: number; secondary?: string; width: number; height: number; opacity: number; rotation: number },
): string {
  const def = getElementDef(key);
  if (!def) return "";
  const inner = def.svg({ color: opts.color, stroke: opts.stroke, secondary: opts.secondary });
  const vb = def.viewBox ?? "0 0 100 100";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${opts.width}" height="${opts.height}" style="opacity:${opts.opacity};transform:rotate(${opts.rotation}deg);transform-origin:center;display:block">${inner}</svg>`;
}
