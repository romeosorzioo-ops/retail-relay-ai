import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTunnelStore } from "@/lib/tunnel-store";
import { TrialGateModal } from "@/components/trial-gate-modal";
import { Calendar, Clock, ArrowLeft, Save, Send, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/essai/publication")({
  component: PublicationPage,
});

function platformLabel(p?: string) {
  if (!p) return "Réseau";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function PublicationPage() {
  const router = useRouter();
  const { generatedPosts, setStep } = useTunnelStore();
  const [open, setOpen] = useState(false);
  const [redirectTo, setRedirectTo] =
    useState<"/calendar" | "/dashboard">("/calendar");

  useEffect(() => {
    setStep("publication");
  }, [setStep]);

  const baseDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  })();

  const openGate = (target: "/calendar" | "/dashboard") => {
    setRedirectTo(target);
    setOpen(true);
  };

  return (
    <div className="relative pb-28">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">
            Programmer et publier
          </h1>
          <p className="text-sm text-muted-foreground">
            Vérifiez le calendrier puis publiez ou enregistrez en brouillon.
          </p>
        </div>

        <div
          className={`space-y-4 transition-opacity ${
            open ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          {generatedPosts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucune publication à planifier.
            </div>
          )}
          {generatedPosts.map((post, i) => {
            const when = new Date(baseDate.getTime() + i * 2 * 60 * 60 * 1000);
            const date = when.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            const time = when.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="komaag-badge">
                      {platformLabel(post.platform)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {post.product_name}
                    </span>
                  </div>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Brouillon
                  </span>
                </div>
                <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {post.caption}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/creation" })}
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openGate("/dashboard")}>
              <Save className="h-4 w-4" /> Brouillon
            </Button>
            <Button variant="outline" onClick={() => openGate("/calendar")}>
              <CalendarClock className="h-4 w-4" /> Programmer
            </Button>
            <Button variant="brand" onClick={() => openGate("/calendar")}>
              <Send className="h-4 w-4" /> Publier
            </Button>
          </div>
        </div>
      </div>

      <TrialGateModal
        open={open}
        onOpenChange={setOpen}
        redirectTo={redirectTo}
      />
    </div>
  );
}
