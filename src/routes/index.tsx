import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Store } from "lucide-react";

const SITE_URL = "https://retail-relay-ai.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Komaag — Créez vos posts magasin en 30 s" },
      {
        name: "description",
        content:
          "Komaag transforme vos promotions et la vie de votre magasin en contenus prêts à publier. Pour Super U, Intermarché, Carrefour Market, Spar.",
      },
      { property: "og:title", content: "Komaag — Créez vos posts magasin en 30 s" },
      {
        property: "og:description",
        content:
          "Transformez vos promotions en posts Facebook et Instagram prêts à publier, pensés pour la grande distribution alimentaire.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:title", content: "Komaag — Créez vos posts magasin en 30 s" },
      {
        name: "twitter:description",
        content:
          "Transformez vos promotions en posts Facebook et Instagram prêts à publier.",
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
            "Komaag transforme les promotions et la vie du magasin en contenus social-media prêts à publier.",
          inLanguage: "fr-FR",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Komaag",
          url: `${SITE_URL}/`,
          description:
            "Service de génération de contenus social-media pour la grande distribution alimentaire.",
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
            "Création automatique de posts Facebook, Instagram et Stories à partir des promotions et de la vie du magasin.",
        }),
      },
    ],
  }),
  component: Landing,
});

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
            <Link to="/auth">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button variant="brand">Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-medium text-white shadow-brand">
            <span className="inline-flex"><Sparkles className="h-3 w-3" /></span>
            IA conçue pour la grande distribution alimentaire
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Vos promos en posts.
            <br />
            <span className="text-brand-gradient">En 30 secondes.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Komaag transforme vos promotions et la vie de votre magasin en
            contenus prêts à publier. Pensé pour Super U, Intermarché, Carrefour
            Market, Spar…
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" variant="brand">Créer mon compte</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Se connecter
              </Button>
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="mx-auto max-w-5xl px-6 pb-24"
        >
          <h2 id="features-heading" className="sr-only">
            Fonctionnalités Komaag
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Store,
                t: "Votre magasin, votre ton",
                d: "Enseigne, ville, rayons forts, ton de communication : l'IA s'adapte.",
              },
              {
                icon: Sparkles,
                t: "Posts adaptés à chaque réseau",
                d: "Post Facebook, post Instagram et Story — d'un clic.",
              },
              {
                icon: Calendar,
                t: "Calendrier éditorial",
                d: "Organisez vos publications avec un planning drag-and-drop.",
              },
            ].map((f) => (
              <article
                key={f.t}
                className="rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md"
              >
                <span className="icon-brand mb-3 inline-flex">
                  <f.icon className="h-6 w-6" />
                </span>
                <h2 className="font-semibold">{f.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Komaag — Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
