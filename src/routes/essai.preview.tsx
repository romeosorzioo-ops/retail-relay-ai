import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTunnelStore } from "@/lib/tunnel-store";
import { SignupGateModal } from "@/components/signup-gate-modal";
import { Calendar, Send, Plus, Save } from "lucide-react";

export const Route = createFileRoute("/essai/preview")({
  component: PreviewPage,
});

function PreviewPage() {
  const { generatedPosts, setGeneratedPosts, setStep } = useTunnelStore();
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    setStep("preview");
  }, [setStep]);

  const updateCaption = (id: string, caption: string) => {
    setGeneratedPosts(
      generatedPosts.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  };

  const triggerGate = () => setGateOpen(true);

  const tryAddFourth = () => {
    if (generatedPosts.length >= 3) {
      triggerGate();
      return;
    }
  };

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Vos publications</h1>
      <p className="mb-6 text-muted-foreground">
        Modifiez vos textes, puis publiez ou programmez.
      </p>

      <div
        className={`space-y-4 transition-opacity ${
          gateOpen ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {generatedPosts.map((post, i) => (
          <div
            key={post.id}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Publication {i + 1} · {post.product_name}
              </div>
            </div>
            <Textarea
              value={post.caption}
              onChange={(e) => updateCaption(post.id, e.target.value)}
              rows={5}
              className="resize-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="brand" onClick={triggerGate}>
                <Send className="h-4 w-4" /> Publier
              </Button>
              <Button size="sm" variant="outline" onClick={triggerGate}>
                <Calendar className="h-4 w-4" /> Programmer
              </Button>
              <Button size="sm" variant="outline" onClick={triggerGate}>
                <Save className="h-4 w-4" /> Sauvegarder
              </Button>
            </div>
          </div>
        ))}

        <button
          onClick={tryAddFourth}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-muted-foreground hover:bg-accent/20"
        >
          <Plus className="h-4 w-4" />
          Créer une 4e publication
        </button>
      </div>

      <SignupGateModal open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
}
