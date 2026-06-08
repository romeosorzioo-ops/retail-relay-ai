export type TemplateKey =
  | "apero"
  | "frais"
  | "bbq"
  | "gourmand"
  | "fraicheur"
  | "soiree"
  | "saisonnier"
  | "default";

export type TemplateConfig = {
  key: TemplateKey;
  label: string;
  tagline: string;
  background: string;
  accent: string; // accent color for prices / badge ring
  badgeClass: string; // tailwind classes for the discount badge
};

export const TEMPLATES: Record<TemplateKey, TemplateConfig> = {
  apero: {
    key: "apero",
    label: "Apéro entre amis",
    tagline: "C'est l'heure de l'apéro",
    background:
      "linear-gradient(135deg, #2a0a1f 0%, #ff66c4 55%, #ffde59 100%)",
    accent: "#ffde59",
    badgeClass: "bg-[#ffde59] text-[#2a0a1f]",
  },
  frais: {
    key: "frais",
    label: "Frais & local",
    tagline: "Frais et local cette semaine",
    background:
      "linear-gradient(135deg, #0c2a1a 0%, #2ecc71 50%, #ffde59 100%)",
    accent: "#ffde59",
    badgeClass: "bg-white text-[#0c2a1a]",
  },
  bbq: {
    key: "bbq",
    label: "Week-end barbecue",
    tagline: "Spécial barbecue du week-end",
    background:
      "linear-gradient(135deg, #2a0a0a 0%, #ff5a3c 55%, #ffde59 100%)",
    accent: "#ffde59",
    badgeClass: "bg-[#ffde59] text-[#2a0a0a]",
  },
  gourmand: {
    key: "gourmand",
    label: "Gourmand & famille",
    tagline: "Le plaisir en famille",
    background:
      "linear-gradient(135deg, #2a1a0a 0%, #ff9d6c 55%, #ffde59 100%)",
    accent: "#ffde59",
    badgeClass: "bg-white text-[#2a1a0a]",
  },
  fraicheur: {
    key: "fraicheur",
    label: "Fraîcheur & praticité",
    tagline: "Pratique et toujours frais",
    background:
      "linear-gradient(135deg, #061a2a 0%, #3ab0ff 55%, #e6f7ff 100%)",
    accent: "#ff66c4",
    badgeClass: "bg-[#ff66c4] text-white",
  },
  soiree: {
    key: "soiree",
    label: "Soirée & boissons",
    tagline: "Pour vos soirées",
    background:
      "linear-gradient(135deg, #0a0a1f 0%, #6a3cff 55%, #ff66c4 100%)",
    accent: "#ffde59",
    badgeClass: "bg-[#ffde59] text-[#0a0a1f]",
  },
  saisonnier: {
    key: "saisonnier",
    label: "Temps fort saisonnier",
    tagline: "Notre sélection du moment",
    background:
      "linear-gradient(135deg, #1a0a2a 0%, #ff66c4 55%, #ffde59 100%)",
    accent: "#ffde59",
    badgeClass: "bg-white text-[#1a0a2a]",
  },
  default: {
    key: "default",
    label: "Offre catalogue",
    tagline: "Offre catalogue",
    background:
      "linear-gradient(135deg, #1a0a14 0%, #ff66c4 55%, #ffde59 100%)",
    accent: "#ffde59",
    badgeClass: "bg-white text-[#ff3aa3]",
  },
};

export function pickTemplateForCategory(category?: string | null): TemplateKey {
  if (!category) return "default";
  const c = category.toLowerCase();
  if (/(apéro|apero|chips|biscuit|salé)/.test(c)) return "apero";
  if (/(fruit|légume|legume|primeur|local)/.test(c)) return "frais";
  if (/(boucherie|viande|barbecue|bbq|grill)/.test(c)) return "bbq";
  if (/(crèmerie|cremerie|fromage|yaourt|lait|laitier)/.test(c)) return "gourmand";
  if (/(surgelé|surgele|glace|frozen)/.test(c)) return "fraicheur";
  if (/(boisson|soda|biere|bière|vin|alcool|jus)/.test(c)) return "soiree";
  if (/(noël|noel|paques|pâques|halloween|saison|fête|fete)/.test(c)) return "saisonnier";
  return "default";
}
