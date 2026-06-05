import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: "catalog", label: "Catalogue" },
  { id: "select",  label: "Sélection" },
  { id: "create",  label: "Création" },
  { id: "validate", label: "Validation" },
  { id: "schedule", label: "Programmation" },
] as const;

export type CampaignStep = (typeof STEPS)[number]["id"];

export function CampaignStepper({ active }: { active: CampaignStep }) {
  const activeIdx = STEPS.findIndex((s) => s.id === active);
  return (
    <div className="flex w-full items-center gap-1 overflow-x-auto rounded-lg border bg-card p-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const isActive = i === activeIdx;
        return (
          <div key={s.id} className="flex flex-1 min-w-[80px] items-center gap-1">
            <div
              className={cn(
                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                done && "bg-primary text-primary-foreground border-primary",
                isActive && "bg-primary/10 border-primary text-primary",
                !done && !isActive && "bg-muted text-muted-foreground border-border",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn(
              "truncate font-medium",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "h-px flex-1 mx-1",
                i < activeIdx ? "bg-primary" : "bg-border",
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
