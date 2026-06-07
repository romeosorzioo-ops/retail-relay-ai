import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileText,
  Palette,
  CalendarDays,
  ArrowDown,
  PlayCircle,
  Store,
} from "lucide-react";

const SITE_URL = "https://retail-relay-ai.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Komaag — Transformez votre catalogue en contenu" },
      {
        name: "description",
        content:
          "Komaag détecte vos promotions et génère automatiquement des contenus prêts à publier pour Facebook et Instagram. Le copilote marketing des magasins alimentaires.",
      },
      { property: "og:title", content: "Komaag — Transformez votre catalogue en contenu" },
      {
        property: "og:description",
        content:
          "Importez votre catalogue PDF, Komaag génère vos posts Facebook et Instagram en quelques clics.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:title", content: "Komaag — Transformez votre catalogue en contenu" },
      {
        name: "twitter:description",
        content:
          "Le premier copilote marketing conçu pour les magasins alimentaires.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Komaag",
          url: `${SITE_URL}/`,
          description:
            "Komaag transforme les catalogues promotionnels en contenus social-media prêts à publier.",
          inLanguage: "fr-FR",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Génération de contenus social-media",
          provider: { "@type": "Organization", name: "Komaag", url: `${SITE_URL}/` },
          areaServed: "FR",
          audience: {
            "@type": "BusinessAudience",
            audienceType: "Magasins de grande distribution alimentaire",
          },
          description:
            "Détection automatique des promotions à partir du catalogue PDF, création de visuels et programmation des publications Facebook & Instagram.",
        }),
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileText,
    title: "Importez votre catalogue",
    desc: "Déposez simplement votre PDF promotionnel. Komaag détecte automatiquement les offres à mettre en avant.",
  },
  {
    icon: Palette,
    title: "Créez vos visuels",
    desc: "Choisissez vos promotions, personnalisez vos créations et adaptez-les à l'identité de votre enseigne.",
  },
  {
    icon: CalendarDays,
    title: "Programmez vos publications",
    desc: "Validez vos contenus et planifiez-les directement sur Facebook et Instagram depuis Komaag.",
  },
] as const;

const STEPS = [
  {
    title: "Importez votre catalogue",
    desc: "Déposez votre catalogue promotionnel au format PDF.",
  },
  {
    title: "Sélectionnez vos promotions",
    desc: "Komaag détecte automatiquement les offres. Choisissez celles que vous souhaitez mettre en avant.",
  },
  {
    title: "Créez vos contenus",
    desc: "Générez vos visuels, textes et publications adaptés à votre enseigne.",
  },
  {
    title: "Programmez vos posts",
    desc: "Planifiez vos publications et gardez une communication régulière toute l'année.",
  },
] as const;

const BRANDS = [
  "Super U",
  "U Express",
  "Hyper U",
  "Intermarché",
  "Carrefour Market",
  "Carrefour Contact",
  "Carrefour City",
  "Spar",
  "Auchan",
  "Casino",
  "Biocoop",
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white font-bold shadow-brand">
              K
            </div>
            <span className="font-semibold">Komaag</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/pricing">
              <Button variant="ghost">Tarifs</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button variant="brand">Créer mes 3 premières publications gratuitement</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-1.5 text-xs font-medium text-white shadow-brand">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Le premier copilote marketing conçu pour les magasins alimentaires
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Transformez votre catalogue en contenu.
            <br />
            <span className="text-brand-gradient">En quelques clics.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Komaag détecte vos promotions et génère automatiquement des contenus
            prêts à publier pour vos réseaux sociaux.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" variant="brand">
                Créer mes 3 premières publications gratuitement
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Voir une démonstration
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section
          aria-labelledby="features-heading"
          className="mx-auto max-w-5xl px-6 pb-20"
        >
          <h2 id="features-heading" className="sr-only">
            Fonctionnalités Komaag
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md"
              >
                <span className="icon-brand mb-3 inline-flex">
                  <f.icon className="h-6 w-6" />
                </span>
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          aria-labelledby="howto-heading"
          className="border-t bg-muted/30"
        >
          <div className="mx-auto max-w-3xl px-6 py-20">
            <div className="mb-12 text-center">
              <h2
                id="howto-heading"
                className="text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Comment ça marche&nbsp;?
              </h2>
              <p className="mt-3 text-muted-foreground">
                De votre catalogue PDF à vos posts programmés, en 4 étapes.
              </p>
            </div>
            <ol className="space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col items-center">
                  <article className="w-full rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-brand">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{s.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </article>
                  {i < STEPS.length - 1 && (
                    <span
                      className="icon-brand my-2 inline-flex"
                      aria-hidden="true"
                    >
                      <ArrowDown className="h-5 w-5" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Target audience */}
        <section
          aria-labelledby="audience-heading"
          className="mx-auto max-w-5xl px-6 py-20 text-center"
        >
          <span className="icon-brand mb-3 inline-flex">
            <Store className="h-6 w-6" />
          </span>
          <h2
            id="audience-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Pensé pour
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Komaag s'adapte aux enseignes de la grande distribution alimentaire.
          </p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {BRANDS.map((b) => (
              <li key={b}>
                <span className="inline-flex items-center rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:shadow-md">
                  {b}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <Link to="/auth">
              <Button size="lg" variant="brand">
                Essayer gratuitement
              </Button>
            </Link>
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
