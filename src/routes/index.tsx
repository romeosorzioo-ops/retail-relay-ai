import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Komaag — Contenus social-media pour magasins" },
      {
        name: "description",
        content:
          "Komaag transforme vos promotions et la vie de votre magasin en contenus prêts à publier. Pour Super U, Intermarché, Carrefour Market, Spar.",
      },
      { property: "og:title", content: "Komaag" },
      {
        property: "og:description",
        content:
          "Komaag transforme vos promotions et la vie de votre magasin en contenus prêts à publier.",
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
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              K
            </div>
            <span className="font-semibold">Komaag</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button>Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs text-accent-foreground">
          <Sparkles className="h-3 w-3" />
          IA conçue pour la grande distribution alimentaire
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Vos promos en posts.
          <br />
          <span className="text-primary">En 30 secondes.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Komaag transforme vos promotions et la vie de votre magasin en
          contenus prêts à publier. Pensé pour Super U, Intermarché, Carrefour
          Market, Spar…
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Créer mon compte</Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              Se connecter
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
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
          <div
            key={f.t}
            className="rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md"
          >
            <f.icon className="mb-3 h-6 w-6 text-primary" />
            <h3 className="font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Komaag — Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
