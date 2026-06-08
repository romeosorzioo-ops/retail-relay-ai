import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTunnelStore } from "@/lib/tunnel-store";
import { SignupGateModal } from "@/components/signup-gate-modal";

export const Route = createFileRoute("/essai/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const setStep = useTunnelStore((s) => s.setStep);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setStep("schedule");
  }, [setStep]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Programmer mes publications</h1>
      <div className="opacity-40 pointer-events-none rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        Calendrier de programmation
      </div>
      <SignupGateModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
