import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useTunnelStore, type TunnelProduct } from "@/lib/tunnel-store";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCheck,
  Square,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/essai/selection")({
  component: SelectionPage,
});

const MOCK_DETECTED: TunnelProduct[] = [
  { id: "m1", product_name: "Côte de bœuf", promo_price: 14.9, old_price: 19.9, discount_percent: 25, category: "Boucherie" },
  { id: "m2", product_name: "Tomates grappes", promo_price: 2.99, old_price: 3.99, discount_percent: 25, category: "Fruits et légumes" },
  { id: "m3", product_name: "Saumon fumé", promo_price: 5.95, old_price: 7.95, discount_percent: 25, category: "Poissonnerie" },
  { id: "m4", product_name: "Pack Coca-Cola", promo_price: 6.5, old_price: 8.9, discount_percent: 27, category: "Boissons" },
  { id: "m5", product_name: "Fromage local", promo_price: 3.8, old_price: 4.9, discount_percent: 22, category: "Produits locaux" },
];

function SelectionPage() {
  const router = useRouter();
  const {
    detectedProducts,
    setDetectedProducts,
    generatedPosts,
    setStep,
  } = useTunnelStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStep("selection");
    if (detectedProducts.length === 0) {
      setDetectedProducts(MOCK_DETECTED);
    }
  }, [setStep, setDetectedProducts, detectedProducts.length]);

  // Default: pre-select products already linked to generated posts, else top 3
  useEffect(() => {
    if (selected.size > 0) return;
    const fromPosts = generatedPosts
      .map((p) => detectedProducts.find((d) => d.product_name === p.product_name)?.id)
      .filter((x): x is string => !!x);
    if (fromPosts.length > 0) {
      setSelected(new Set(fromPosts));
    } else if (detectedProducts.length > 0) {
      setSelected(new Set(detectedProducts.slice(0, 3).map((d) => d.id)));
    }
  }, [detectedProducts, generatedPosts, selected.size]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    detectedProducts.forEach((p) => p.category && set.add(p.category));
    return ["all", ...Array.from(set)];
  }, [detectedProducts]);

  const filtered = useMemo(() => {
    return detectedProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (query && !p.product_name.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [detectedProducts, query, category]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelected(new Set(filtered.map((p) => p.id)));

  const clearAll = () => setSelected(new Set());

  return (
    <div className="relative pb-28">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">
            Sélectionnez vos promotions
          </h1>
          <p className="text-sm text-muted-foreground">
            Choisissez les promotions à transformer en publications.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "Tous les rayons" : c}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckCheck className="h-4 w-4" /> Tout sélectionner
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Square className="h-4 w-4" /> Tout désélectionner
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const checked = selected.has(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  checked
                    ? "border-primary bg-brand-gradient-soft"
                    : "border-border bg-card hover:bg-accent/30"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(p.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex h-20 w-full items-center justify-center rounded-md bg-muted/60 text-muted-foreground mb-3">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.product_name}
                        className="h-full w-full object-cover rounded-md"
                      />
                    ) : (
                      <Tag className="h-6 w-6 opacity-60" />
                    )}
                  </div>
                  <div className="font-medium text-sm">{p.product_name}</div>
                  <div className="mt-1 flex items-baseline gap-2 text-sm">
                    {p.promo_price != null && (
                      <span className="font-semibold text-foreground">
                        {p.promo_price.toFixed(2)}€
                      </span>
                    )}
                    {p.old_price != null && (
                      <span className="text-xs text-muted-foreground line-through">
                        {p.old_price.toFixed(2)}€
                      </span>
                    )}
                    {p.discount_percent != null && (
                      <span className="ml-auto rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold text-white">
                        -{p.discount_percent}%
                      </span>
                    )}
                  </div>
                  {p.category && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {p.category}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucun produit ne correspond aux filtres.
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/analyse" })}
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          <div className="text-xs text-muted-foreground">
            {selected.size} promotion{selected.size > 1 ? "s" : ""} sélectionnée
            {selected.size > 1 ? "s" : ""}
          </div>
          <Button
            variant="brand"
            disabled={selected.size === 0}
            onClick={() => {
              setStep("creation");
              router.navigate({ to: "/essai/creation" });
            }}
          >
            Créer mes contenus <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
