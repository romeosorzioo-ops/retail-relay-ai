import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workflow/import")({
  component: WorkflowImport,
});

function WorkflowImport() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient-soft">
        <FileUp className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">Importer un catalogue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Déposez votre catalogue PDF, JPG ou PNG pour démarrer le workflow.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="brand">
          <Link to="/catalog">
            Ouvrir l'import <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/workflow/analyse">Étape suivante</Link>
        </Button>
      </div>
    </div>
  );
}
