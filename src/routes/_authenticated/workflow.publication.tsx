import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Send, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workflow/publication")({
  component: WorkflowPublication,
});

function WorkflowPublication() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient-soft">
        <Send className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">Programmer et publier</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Planifiez vos publications dans le calendrier ou publiez immédiatement.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="brand">
          <Link to="/calendar">
            <CalendarClock className="h-4 w-4" /> Ouvrir le calendrier
          </Link>
        </Button>
      </div>
    </div>
  );
}
