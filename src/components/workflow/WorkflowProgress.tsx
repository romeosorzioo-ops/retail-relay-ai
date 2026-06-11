import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type WorkflowStep =
  | "import"
  | "analyse"
  | "selection"
  | "creation"
  | "publication";

export type WorkflowMode = "trial" | "app";

const STEPS: { key: WorkflowStep; label: string }[] = [
  { key: "import", label: "Import" },
  { key: "analyse", label: "Analyse" },
  { key: "selection", label: "Sélection" },
  { key: "creation", label: "Création" },
  { key: "publication", label: "Publication" },
];

function pathFor(mode: WorkflowMode, step: WorkflowStep): string {
  const base = mode === "trial" ? "/essai" : "/workflow";
  return `${base}/${step}`;
}

export function WorkflowProgress({
  active,
  mode,
}: {
  active: WorkflowStep;
  mode: WorkflowMode;
}) {
  const activeIdx = STEPS.findIndex((s) => s.key === active);
  return (
    <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        {STEPS.map((step, i) => {
          const done = i < activeIdx;
          const isActive = i === activeIdx;
          const reachable = i <= activeIdx;
          const node = (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  done && "bg-brand-gradient text-white",
                  isActive &&
                    "bg-brand-gradient text-white ring-2 ring-offset-2 ring-offset-background ring-primary",
                  !done && !isActive && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
          return (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              {reachable ? (
                <Link to={pathFor(mode, step.key)} className="hover:opacity-80">
                  {node}
                </Link>
              ) : (
                <div className="opacity-70">{node}</div>
              )}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    i < activeIdx ? "bg-brand-gradient" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
