import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const SITE_URL = "https://retail-relay-ai.lovable.app";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Tarifs — Komaag" },
      {
        name: "description",
        content:
          "Choisissez l'offre Komaag adaptée à votre rythme de publication : Essentiel, Pro ou Premium.",
      },
      { property: "og:title", content: "Tarifs — Komaag" },
      {
        property: "og:description",
        content:
          "Des offres simples pour transformer votre catalogue en contenu : 4, 12 ou 30 publications par mois.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pricing` }],
  }),
  component: PricingPage,
});

type Plan = {
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Essentiel",
    price: "29€",
    cadence: "≈ 1 publication par semaine",
    features: [
      "Jusqu'à 4 publications programmées / mois",
      "Détection automatique des promotions",
      "Génération de visuels & textes",
      "Programmation Facebook & Instagram",
    ],
  },
  {
    name: "Pro",
    price: "59€",
    cadence: "≈ 3 publications par semaine",
    badge: "Le plus populaire",
    highlighted: true,
    features: [
      "Jusqu'à 12 publications programmées / mois",
      "Tout ce qui est inclus dans Essentiel",
      "Calendrier éditorial avancé",
      "Modèles premium",
    ],
  },
  {
    name: "Premium",
    price: "89€",
    cadence: "≈ 1 publication par jour",
    features: [
      "Jusqu'à 30 publications programmées / mois",
      "Tout ce qui est inclus dans Pro",
      "Support prioritaire",
      "Accompagnement personnalisé",
    ],
  },
];

const COMPARE = [
  { label: "Publications programmées / mois", values: ["4", "12", "30"] },
  { label: "Détection auto des promotions", values: ["✓", "✓", "✓"] },
  { label: "Génération de visuels IA", values: ["✓", "✓", "✓"] },
  { label: "Programmation FB & Instagram", values: ["✓", "✓", "✓"] },
  { label: "Calendrier éditorial avancé", values: ["—", "✓", "✓"] },
  { label: "Modèles premium", values: ["—", "✓", "✓"] },
  { label: "Support prioritaire", values: ["—", "—", "✓"] },
  { label: "Accompagnement personnalisé", values: ["—", "—", "✓"] },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white font-bold shadow-brand">
              K
            </div>
            <span className="font-semibold">Komaag</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button variant="brand">Commencer gratuitement</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Des offres adaptées à <span className="text-brand-gradient">votre rythme</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Commencez gratuitement avec 3 publications. Choisissez ensuite
            l'offre qui correspond à votre stratégie de communication.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <article
                key={p.name}
                className={
                  "relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm transition hover:shadow-md " +
                  (p.highlighted ? "ring-2 ring-pink-300 shadow-brand" : "")
                }
              >
                {p.badge && (
                  <Badge variant="brand" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Star className="mr-1 h-3 w-3" aria-hidden="true" />
                    {p.badge}
                  </Badge>
                )}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">/mois</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.cadence}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="icon-brand mt-0.5 inline-flex">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="mt-8 block">
                  <Button variant={p.highlighted ? "brand" : "outline"} className="w-full">
                    Commencer gratuitement
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Comparer les offres
            </h2>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold">Fonctionnalité</th>
                    {PLANS.map((p) => (
                      <th key={p.name} className="px-4 py-3 text-center font-semibold">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="px-4 py-3">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center text-muted-foreground">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-10 text-center">
              <Link to="/auth">
                <Button size="lg" variant="brand">
                  Commencer gratuitement
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Komaag — Transformez votre catalogue en contenu.
        </div>
      </footer>
    </div>
  );
}
