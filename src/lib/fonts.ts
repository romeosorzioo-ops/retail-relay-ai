// Centralised font library used across Création + Mon magasin

export type FontDef = {
  name: string;          // display name = CSS family
  googleHref?: string;   // weights string for Google Fonts URL
  category: "sans" | "serif" | "display";
};

export const FONT_LIBRARY: FontDef[] = [
  { name: "Inter", googleHref: "wght@400;500;600;700;800;900", category: "sans" },
  { name: "Roboto", googleHref: "wght@400;500;700;900", category: "sans" },
  { name: "Open Sans", googleHref: "wght@400;600;700;800", category: "sans" },
  { name: "Montserrat", googleHref: "wght@400;500;600;700;800;900", category: "sans" },
  { name: "Poppins", googleHref: "wght@400;500;600;700;800;900", category: "sans" },
  { name: "Oswald", googleHref: "wght@400;500;600;700", category: "sans" },
  { name: "Bebas Neue", googleHref: "wght@400", category: "display" },
  { name: "Anton", googleHref: "wght@400", category: "display" },
  { name: "League Spartan", googleHref: "wght@400;500;600;700;800;900", category: "sans" },
  { name: "Playfair Display", googleHref: "wght@400;500;600;700;800;900", category: "serif" },
];

export const FONT_NAMES = FONT_LIBRARY.map((f) => f.name);

/** Build a single CSS URL that loads every library font in one request. */
export function googleFontsUrl(): string {
  // Komaag brand fonts (Sora for headings, DM Sans for body) + library fonts
  const komaagFamilies = [
    "family=Sora:wght@400;600;700",
    "family=DM+Sans:wght@400;500",
  ];
  const libraryFamilies = FONT_LIBRARY.filter((f) => f.googleHref)
    .map((f) => `family=${encodeURIComponent(f.name).replace(/%20/g, "+")}:${f.googleHref}`);
  const families = [...komaagFamilies, ...libraryFamilies].join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Register a custom uploaded font in the browser. Safe to call multiple times. */
const registered = new Set<string>();
export function registerCustomFont(name: string, url: string) {
  if (typeof window === "undefined") return;
  const key = `${name}::${url}`;
  if (registered.has(key)) return;
  try {
    const ff = new FontFace(name, `url(${url})`);
    ff.load()
      .then((loaded) => {
        (document as Document).fonts.add(loaded);
        registered.add(key);
      })
      .catch(() => {});
  } catch {
    /* noop */
  }
}
