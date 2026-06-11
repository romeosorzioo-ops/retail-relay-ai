import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { WorkflowProgress } from "@/components/workflow/WorkflowProgress";
import { useRouterState } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTunnelStore } from "@/lib/tunnel-store";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const generatedPosts = useTunnelStore((s) => s.generatedPosts);
  const currentStep = useTunnelStore((s) => s.currentStep);

  useEffect(() => {
    if (generatedPosts.length > 0 && currentStep !== "import") {
      toast("Vos publications vous attendent", {
        description: `Vous avez ${generatedPosts.length} publication${generatedPosts.length > 1 ? "s" : ""} en cours de création.`,
        action: {
          label: "Reprendre",
          onClick: () => navigate({ to: "/essai/preview" }),
        },
      });
    }
  }, [generatedPosts.length, currentStep, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background bg-grid">
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
      <WorkflowProgressBar />
    </div>
  );
}

function WorkflowProgressBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const seg = path.split("/")[2] || "import";
  const valid = ["import", "analyse", "selection", "creation", "publication"] as const;
  const active = (valid as readonly string[]).includes(seg) ? (seg as typeof valid[number]) : "import";
  return (
    <>
      <WorkflowProgress active={active} mode="trial" />
      <main className="flex-1">
        <Outlet />
      </main>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
