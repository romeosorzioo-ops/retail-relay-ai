import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useTunnelStore,
  type TunnelPost,
  type TunnelProduct,
  type TunnelPlatform,
} from "@/lib/tunnel-store";
import { TrialGateModal } from "@/components/trial-gate-modal";
import { FacebookMockup } from "@/components/post-mockups/FacebookMockup";
import { InstagramMockup } from "@/components/post-mockups/InstagramMockup";
import { LinkedInMockup } from "@/components/post-mockups/LinkedInMockup";
import { ArrowLeft, ArrowRight, RefreshCw, Plus, Loader2, X } from "lucide-react";
import { PROMO_GRADIENTS } from "@/components/post-mockups/PromoVisualMockup";
import { ChangeImageModal } from "@/components/change-image-modal";
import { base64ToBlobUrl, renderPdfPageToDataUrl } from "@/lib/pdf-browser";
import { pickTemplateForCategory, TEMPLATES, type TemplateKey } from "@/lib/promo-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/essai/preview")({
  component: PreviewPage,
});

const MOCK_DETECTED: TunnelProduct[] = [
  { id: "m1", product_name: "Côte de bœuf", promo_price: 14.9, old_price: 19.9, discount_percent: 25, category: "Boucherie" },
  { id: "m2", product_name: "Tomates grappes", promo_price: 2.99, old_price: 3.99, discount_percent: 25, category: "Fruits et légumes" },
  { id: "m3", product_name: "Saumon fumé", promo_price: 5.95, old_price: 7.95, discount_percent: 25, category: "Poissonnerie" },
  { id: "m4", product_name: "Pack Coca-Cola", promo_price: 6.5, old_price: 8.9, discount_percent: 27, category: "Boissons" },
  { id: "m5", product_name: "Fromage local", promo_price: 3.8, old_price: 4.9, discount_percent: 22, category: "Produits locaux" },
];

const PLATFORMS: TunnelPlatform[] = ["facebook", "instagram", "linkedin"];

const FORMAT_BY_PLATFORM: Record<TunnelPlatform, "16:9" | "1:1" | "1.91:1"> = {
  facebook: "16:9",
  instagram: "1:1",
  linkedin: "1.91:1",
};

const BADGE_TEXTS = ["Offre catalogue", "Promo de la semaine", "Bon plan", "À ne pas manquer"];

function buildMockPosts(products: TunnelProduct[]): TunnelPost[] {
  return products.slice(0, 3).map((p, i) => {
    const platform = PLATFORMS[i];
    const tpl = pickTemplateForCategory(p.category);
    return {
      id: `seed-${p.id}`,
      product_name: p.product_name,
      platform,
      selected: true,
      imageUrl: null,
      visualTemplate: tpl,
      visualStatus: "pending",
      visualMock: {
        productName: p.product_name,
        promoPrice: p.promo_price ?? null,
        oldPrice: p.old_price ?? null,
        discount: p.discount_percent ?? null,
        category: p.category ?? null,
        backgroundGradient: PROMO_GRADIENTS[i % PROMO_GRADIENTS.length],
        badgeText: BADGE_TEXTS[0],
        format: FORMAT_BY_PLATFORM[platform],
        variant: 0,
      },
      caption: `🛒 Bon plan ${p.product_name} à seulement ${p.promo_price?.toFixed(2)}€ ! Profitez-en cette semaine. #promo #${p.category?.toLowerCase().replace(/\s+/g, "")}`,
    };
  });
}

function PreviewPage() {
  const router = useRouter();
  const {
    detectedProducts,
    generatedPosts,
    pdfBase64,
    setDetectedProducts,
    setGeneratedPosts,
    setStep,
  } = useTunnelStore();
  const [gateOpen, setGateOpen] = useState(false);
  const [network, setNetwork] = useState<TunnelPlatform>("facebook");
  const [extracting, setExtracting] = useState(false);
  const [changeImageFor, setChangeImageFor] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const storeName =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("komaag-trial-account") || "{}")
          .storeName || "Mon magasin"
      : "Mon magasin";

  // Build a stable blob URL from the in-memory pdfBase64 (not persisted).
  useEffect(() => {
    if (!pdfBase64) return;
    const url = base64ToBlobUrl(pdfBase64);
    pdfUrlRef.current = url;
    return () => {
      URL.revokeObjectURL(url);
      pdfUrlRef.current = null;
    };
  }, [pdfBase64]);

  // Lazy extract product images for SELECTED posts only (max 3).
  useEffect(() => {
    const url = pdfUrlRef.current;
    if (!url) return;
    const targets = generatedPosts.filter(
      (p) => !p.productImageUrl && (p.pageNumber || true),
    );
    if (targets.length === 0) return;
    let cancelled = false;
    (async () => {
      setExtracting(true);
      try {
        const updates: Record<string, string> = {};
        for (let i = 0; i < targets.length; i++) {
          const post = targets[i];
          const page =
            post.pageNumber ??
            detectedProducts.find((d) => d.product_name === post.product_name)
              ?.pageNumber ??
            i + 1;
          try {
            const dataUrl = await renderPdfPageToDataUrl(url, page, 1200);
            if (cancelled) return;
            updates[post.id] = dataUrl;
          } catch (e) {
            console.warn("Page render failed", page, e);
          }
        }
        if (cancelled || Object.keys(updates).length === 0) return;
        setGeneratedPosts(
          generatedPosts.map((p) =>
            updates[p.id]
              ? { ...p, productImageUrl: updates[p.id], imageUrl: p.imageUrl ?? updates[p.id] }
              : p,
          ),
        );
      } finally {
        if (!cancelled) setExtracting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBase64, generatedPosts.length]);

  useEffect(() => {
    setStep("preview");
    // Seed mock data if needed
    let products = detectedProducts;
    if (products.length === 0) {
      products = MOCK_DETECTED;
      setDetectedProducts(products);
    }
    if (generatedPosts.length === 0) {
      setGeneratedPosts(buildMockPosts(products));
    } else {
      // Backfill visualMock for posts persisted before the feature shipped
      const needsBackfill = generatedPosts.some((p) => !p.visualMock);
      if (needsBackfill) {
        setGeneratedPosts(
          generatedPosts.map((p, i) => {
            if (p.visualMock) return p;
            const match = products.find((d) => d.product_name === p.product_name);
            const platform = p.platform ?? PLATFORMS[i % PLATFORMS.length];
            return {
              ...p,
              platform,
              visualMock: {
                productName: p.product_name,
                promoPrice: match?.promo_price ?? null,
                oldPrice: match?.old_price ?? null,
                discount: match?.discount_percent ?? null,
                category: match?.category ?? null,
                backgroundGradient: PROMO_GRADIENTS[i % PROMO_GRADIENTS.length],
                badgeText: BADGE_TEXTS[0],
                format: FORMAT_BY_PLATFORM[platform],
                variant: 0,
              },
            };
          }),
        );
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync selected ids with generated posts on first load / changes in length
  useEffect(() => {
    setSelectedIds(generatedPosts.map((p) => p.id));
  }, [generatedPosts.length]);

  const visiblePosts = useMemo(
    () =>
      generatedPosts.filter(
        (p) =>
          selectedIds.includes(p.id) &&
          (p.platform === network || !p.platform),
      ),
    [generatedPosts, selectedIds, network],
  );

  const remaining = Math.max(0, 3 - generatedPosts.length);

  const updateCaption = (id: string, caption: string) => {
    setGeneratedPosts(
      generatedPosts.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  };

  const toggleProduct = (postId: string) => {
    setSelectedIds((prev) =>
      prev.includes(postId) ? prev.filter((x) => x !== postId) : [...prev, postId],
    );
  };

  const tryAddPost = () => {
    if (generatedPosts.length >= 3) {
      setGateOpen(true);
      return;
    }
  };

  const regenerateVisual = (id: string) => {
    setGeneratedPosts(
      generatedPosts.map((p) => {
        if (p.id !== id || !p.visualMock) return p;
        const nextVariant = (p.visualMock.variant ?? 0) + 1;
        return {
          ...p,
          visualMock: {
            ...p.visualMock,
            variant: nextVariant,
            backgroundGradient:
              PROMO_GRADIENTS[nextVariant % PROMO_GRADIENTS.length],
            badgeText: BADGE_TEXTS[nextVariant % BADGE_TEXTS.length],
          },
        };
      }),
    );
  };

  const setPostImage = (id: string, dataUrl: string) => {
    setGeneratedPosts(
      generatedPosts.map((p) => (p.id === id ? { ...p, imageUrl: dataUrl } : p)),
    );
  };

  const renderMockup = (post: TunnelPost) => {
    const common = {
      storeName,
      postText: post.caption,
      imageUrl: post.imageUrl ?? undefined,
      visualMock: post.visualMock ?? undefined,
      onTextChange: (t: string) => updateCaption(post.id, t),
      onRegenerateImage: () => regenerateVisual(post.id),
      onChangeImage: () => setChangeImageFor(post.id),
    };
    if (network === "facebook") return <FacebookMockup key={post.id} {...common} />;
    if (network === "instagram") return <InstagramMockup key={post.id} {...common} />;
    return <LinkedInMockup key={post.id} {...common} />;
  };

  const activePost = generatedPosts.find((p) => p.id === changeImageFor) || null;
  const aspectByPlatform: Record<TunnelPlatform, string> = {
    facebook: "16/9",
    instagram: "1/1",
    linkedin: "1.91/1",
  };

  return (
    <div className="relative pb-28">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Vos publications</h1>
            <p className="text-sm text-muted-foreground">
              Modifiez vos textes en ligne, puis planifiez.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              remaining <= 1
                ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                : "border-primary/30 bg-primary/15 text-primary"
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
          <aside className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Produits détectés</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={tryAddPost}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
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
                          {p.promo_price.toFixed(2)}€
                          {p.category ? (
                            <span className="ml-1 opacity-60">· {p.category}</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </aside>

          <section>
            <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
              {PLATFORMS.map((n) => (
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
                  Aucune publication pour ce réseau. Choisissez un autre onglet.
                </div>
              ) : (
                visiblePosts.map(renderMockup)
              )}
            </div>
          </section>
        </div>
      </div>

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
          <Button onClick={() => router.navigate({ to: "/essai/schedule" })}>
            Planifier <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {extracting && (
        <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Extraction des images produits…
          </span>
        </div>
      )}

      <ChangeImageModal
        open={!!activePost}
        onOpenChange={(v) => !v && setChangeImageFor(null)}
        pdfBase64={pdfBase64 || undefined}
        currentImageUrl={activePost?.imageUrl ?? activePost?.productImageUrl ?? null}
        aspectRatio={activePost ? aspectByPlatform[activePost.platform ?? network] : "1/1"}
        onSelect={(dataUrl) => {
          if (activePost) setPostImage(activePost.id, dataUrl);
          setChangeImageFor(null);
        }}
      />

      <TrialGateModal open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
}
