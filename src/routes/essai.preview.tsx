import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTunnelStore } from "@/lib/tunnel-store";
import { SignupGateModal } from "@/components/signup-gate-modal";
import { FacebookMockup } from "@/components/post-mockups/FacebookMockup";
import { InstagramMockup } from "@/components/post-mockups/InstagramMockup";
import { LinkedInMockup } from "@/components/post-mockups/LinkedInMockup";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/essai/preview")({
  component: PreviewPage,
});

type Network = "facebook" | "instagram" | "linkedin";

function PreviewPage() {
  const router = useRouter();
  const { detectedProducts, generatedPosts, setGeneratedPosts, setStep } =
    useTunnelStore();
  const [gateOpen, setGateOpen] = useState(false);
  const [network, setNetwork] = useState<Network>("facebook");
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    generatedPosts.slice(0, 3).map((p) => p.id),
  );
  const storeName = "Mon magasin";

  useEffect(() => {
    setStep("preview");
  }, [setStep]);

  const visiblePosts = useMemo(
    () => generatedPosts.filter((p) => selectedIds.includes(p.id)),
    [generatedPosts, selectedIds],
  );

  const remaining = Math.max(0, 3 - generatedPosts.length);

  const updateCaption = (id: string, caption: string) => {
    setGeneratedPosts(
      generatedPosts.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  };

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const triggerGate = () => setGateOpen(true);

  const renderMockup = (post: (typeof generatedPosts)[number]) => {
    const common = {
      storeName,
      postText: post.caption,
      onTextChange: (t: string) => updateCaption(post.id, t),
    };
    if (network === "facebook") return <FacebookMockup key={post.id} {...common} />;
    if (network === "instagram") return <InstagramMockup key={post.id} {...common} />;
    return <LinkedInMockup key={post.id} {...common} />;
  };

  return (
    <div className="relative pb-28">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vos publications</h1>
            <p className="text-sm text-muted-foreground">
              Modifiez vos textes en ligne, puis planifiez.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              remaining <= 1
                ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                : "border-primary/30 bg-primary/15 text-primary-foreground/90"
            }`}
          >
            {remaining} publication{remaining > 1 ? "s" : ""} restante
            {remaining > 1 ? "s" : ""}
          </span>
        </div>

        <div
          className={`grid grid-cols-1 gap-6 lg:grid-cols-[30%_1fr] transition-opacity ${
            gateOpen ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          {/* Left panel: products */}
          <aside className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Produits détectés</div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {detectedProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun produit détecté.
                </p>
              )}
              {detectedProducts.map((p) => {
                const matched = generatedPosts.find(
                  (gp) => gp.product_name === p.product_name,
                );
                const checked = matched ? selectedIds.includes(matched.id) : false;
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-2 hover:bg-accent/30"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!matched}
                      onCheckedChange={() => matched && toggleProduct(matched.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-medium">{p.product_name}</div>
                      {p.promo_price != null && (
                        <div className="text-muted-foreground">
                          {p.promo_price}€
                          {p.old_price ? (
                            <span className="ml-1 line-through opacity-60">
                              {p.old_price}€
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </aside>

          {/* Right panel: tabs + mockups */}
          <section>
            <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
              {(["facebook", "instagram", "linkedin"] as Network[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    network === n
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {visiblePosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Sélectionnez un produit à gauche pour afficher la prévisualisation.
                </div>
              ) : (
                visiblePosts.map(renderMockup)
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/analyse" })}
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/analyse" })}
          >
            <RefreshCw className="h-4 w-4" /> Régénérer
          </Button>
          <Button onClick={triggerGate}>
            Planifier <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <SignupGateModal open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
}
