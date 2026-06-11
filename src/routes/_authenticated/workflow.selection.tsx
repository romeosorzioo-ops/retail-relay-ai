import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workflow/selection")({
  component: WorkflowSelection,
});

function WorkflowSelection() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient-soft">
        <Tag className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">Sélectionner les promotions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choisissez les promotions à transformer en contenus.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="brand">
          <Link to="/promotions">Ouvrir mes promotions</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/workflow/creation">
            Créer mes contenus <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
