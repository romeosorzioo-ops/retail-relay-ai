import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workflow/creation")({
  component: WorkflowCreation,
});

function WorkflowCreation() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient-soft">
        <Palette className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">Création des visuels</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Personnalisez vos visuels avec l'éditeur Komaag.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="brand">
          <Link to="/creation">Ouvrir l'éditeur</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/workflow/publication">
            Valider <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
