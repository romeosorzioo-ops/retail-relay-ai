import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TunnelProgress } from "@/components/tunnel-progress";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/essai")({
  head: () => ({
    meta: [
      { title: "Essayer Komaag gratuitement" },
      {
        name: "description",
        content:
          "Testez Komaag sans compte : importez votre catalogue et générez vos publications en quelques minutes.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: EssaiLayout,
});

function EssaiLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold text-brand-gradient">
            Komaag
          </Link>
          <Link
            to="/auth"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Se connecter
          </Link>
        </div>
      </header>
      <TunnelProgress />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
