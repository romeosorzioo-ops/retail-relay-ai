import { Link, useNavigate } from "@tanstack/react-router";
import { useTunnelStore, type TunnelStep } from "@/lib/tunnel-store";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STEPS: { key: TunnelStep; label: string; to: string }[] = [
  { key: "import", label: "Import", to: "/essai/import" },
  { key: "analyse", label: "Analyse", to: "/essai/analyse" },
  { key: "preview", label: "Publications", to: "/essai/preview" },
];

export function TunnelProgress() {
  const navigate = useNavigate();
  const currentStep = useTunnelStore((s) => s.currentStep);
  const reset = useTunnelStore((s) => s.reset);
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const activeIndex = currentIndex === -1 ? 2 : currentIndex; // schedule = past preview

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <Link
                to={step.to}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  done && "text-foreground",
                  active && "text-foreground",
                  !done && !active && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    done && "bg-brand-gradient text-white",
                    active &&
                      "bg-brand-gradient text-white ring-2 ring-offset-2 ring-offset-background ring-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    done ? "bg-brand-gradient" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className="ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            reset();
            navigate({ to: "/essai/import" });
            toast.info("Tunnel réinitialisé");
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Recommencer</span>
        </Button>
      </div>
    </div>
  );
}
