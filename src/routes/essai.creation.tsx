import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useTunnelStore,
  type TunnelPost,
  type TunnelProduct,
  type TunnelPlatform,
} from "@/lib/tunnel-store";
import { FacebookMockup } from "@/components/post-mockups/FacebookMockup";
import { InstagramMockup } from "@/components/post-mockups/InstagramMockup";
import { LinkedInMockup } from "@/components/post-mockups/LinkedInMockup";
import { ArrowLeft, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { PROMO_GRADIENTS } from "@/components/post-mockups/PromoVisualMockup";
import { ChangeImageModal } from "@/components/change-image-modal";
import { base64ToBlobUrl, renderPdfPageToDataUrl } from "@/lib/pdf-browser";
import {
  pickTemplateForCategory,
  TEMPLATES,
  type TemplateKey,
} from "@/lib/promo-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/essai/creation")({
  component: CreationPage,
});

const PLATFORMS: TunnelPlatform[] = ["facebook", "instagram", "linkedin"];

const FORMAT_BY_PLATFORM: Record<TunnelPlatform, "16:9" | "1:1" | "1.91:1"> = {
  facebook: "16:9",
  instagram: "1:1",
  linkedin: "1.91:1",
};

const BADGE_TEXTS = [
  "Offre catalogue",
  "Promo de la semaine",
  "Bon plan",
  "À ne pas manquer",
];

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
      caption: `🛒 Bon plan ${p.product_name} à seulement ${p.promo_price?.toFixed(2)}€ ! Profitez-en cette semaine. #promo`,
    };
  });
}

function CreationPage() {
  const router = useRouter();
  const {
    detectedProducts,
    generatedPosts,
    pdfBase64,
    setGeneratedPosts,
    setStep,
  } = useTunnelStore();
  const [network, setNetwork] = useState<TunnelPlatform>("facebook");
  const [extracting, setExtracting] = useState(false);
  const [changeImageFor, setChangeImageFor] = useState<string | null>(null);
  const [sourceImageFor, setSourceImageFor] = useState<string | null>(null);
  const [templateVariants, setTemplateVariants] = useState<
    Record<string, number>
  >({});
  const pdfUrlRef = useRef<string | null>(null);
  const storeName =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("komaag-trial-account") || "{}")
          .storeName || "Mon magasin"
      : "Mon magasin";

  useEffect(() => {
    setStep("creation");
    if (generatedPosts.length === 0 && detectedProducts.length > 0) {
      setGeneratedPosts(buildMockPosts(detectedProducts));
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!pdfBase64) return;
    const url = base64ToBlobUrl(pdfBase64);
    pdfUrlRef.current = url;
    return () => {
      URL.revokeObjectURL(url);
      pdfUrlRef.current = null;
    };
  }, [pdfBase64]);

  useEffect(() => {
    const url = pdfUrlRef.current;
    if (!url) return;
    const targets = generatedPosts.filter((p) => !p.sourceImageUrl);
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
            detectedProducts.find(
              (d) => d.product_name === post.product_name,
            )?.pageNumber ??
            i + 1;
          try {
            const dataUrl = await renderPdfPageToDataUrl(url, page, 1200);
            if (cancelled) return;
            updates[post.id] = dataUrl;
          } catch (e) {
            console.warn("Page render failed", page, e);
          }
        }
        if (cancelled) return;
        setGeneratedPosts(
          generatedPosts.map((p) => {
            if (p.sourceImageUrl) return p;
            const src = updates[p.id];
            if (!src) return { ...p, visualStatus: "fallback" };
            return {
              ...p,
              sourceImageUrl: src,
              cutoutImageUrl: src,
              finalVisualUrl: null,
              visualStatus: "template_generated",
            };
          }),
        );
      } finally {
        if (!cancelled) setExtracting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [pdfBase64, generatedPosts.length]);

  const visiblePosts = useMemo(
    () =>
      generatedPosts.filter(
        (p) => p.platform === network || !p.platform,
      ),
    [generatedPosts, network],
  );

  const updateCaption = (id: string, caption: string) => {
    setGeneratedPosts(
      generatedPosts.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  };

  const regenerateVisual = (id: string) => {
    setTemplateVariants((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
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
      generatedPosts.map((p) =>
        p.id === id
          ? {
              ...p,
              cutoutImageUrl: dataUrl,
              sourceImageUrl: p.sourceImageUrl ?? dataUrl,
              visualStatus: "template_generated",
            }
          : p,
      ),
    );
  };

  const buildTemplateData = (post: TunnelPost) => {
    const product = detectedProducts.find(
      (d) => d.product_name === post.product_name,
    );
    const template =
      (post.visualTemplate as TemplateKey | undefined) ??
      pickTemplateForCategory(product?.category ?? post.visualMock?.category);
    const tplKeys = Object.keys(TEMPLATES) as TemplateKey[];
    const variantOffset = templateVariants[post.id] ?? 0;
    const effectiveTemplate =
      variantOffset === 0
        ? template
        : tplKeys[(tplKeys.indexOf(template) + variantOffset) % tplKeys.length];
    return {
      productName: post.product_name,
      promoPrice: product?.promo_price ?? post.visualMock?.promoPrice ?? null,
      oldPrice: product?.old_price ?? post.visualMock?.oldPrice ?? null,
      discount: product?.discount_percent ?? post.visualMock?.discount ?? null,
      category: product?.category ?? post.visualMock?.category ?? null,
      storeName,
      template: effectiveTemplate,
      format: FORMAT_BY_PLATFORM[post.platform ?? network],
      variant: variantOffset,
      cutoutImageUrl: post.cutoutImageUrl ?? null,
      sourceImageUrl: post.sourceImageUrl ?? null,
      fallback: post.visualStatus === "fallback" || !post.sourceImageUrl,
      onShowSource: post.sourceImageUrl
        ? () => setSourceImageFor(post.id)
        : undefined,
      onRegenerateTemplate: () => regenerateVisual(post.id),
    };
  };

  const renderMockup = (post: TunnelPost) => {
    const templateData = buildTemplateData(post);
    const common = {
      storeName,
      postText: post.caption,
      visualMock: post.visualMock ?? undefined,
      templateData,
      onTextChange: (t: string) => updateCaption(post.id, t),
      onRegenerateImage: () => regenerateVisual(post.id),
      onChangeImage: () => setChangeImageFor(post.id),
    };
    if (network === "facebook")
      return <FacebookMockup key={post.id} {...common} />;
    if (network === "instagram")
      return <InstagramMockup key={post.id} {...common} />;
    return <LinkedInMockup key={post.id} {...common} />;
  };

  const activePost = generatedPosts.find((p) => p.id === changeImageFor) || null;
  const sourcePost = generatedPosts.find((p) => p.id === sourceImageFor) || null;
  const aspectByPlatform: Record<TunnelPlatform, string> = {
    facebook: "16/9",
    instagram: "1/1",
    linkedin: "1.91/1",
  };

  return (
    <div className="relative pb-28">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">
            Personnalisez vos visuels
          </h1>
          <p className="text-sm text-muted-foreground">
            Modifiez les textes, l'image, et le modèle pour chaque publication.
          </p>
        </div>

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
              Aucune publication pour ce réseau.
            </div>
          ) : (
            visiblePosts.map(renderMockup)
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/selection" })}
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button
            variant="outline"
            onClick={() => router.navigate({ to: "/essai/analyse" })}
          >
            <RefreshCw className="h-4 w-4" /> Régénérer
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              setStep("publication");
              router.navigate({ to: "/essai/publication" });
            }}
          >
            Valider <ArrowRight className="h-4 w-4" />
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
        currentImageUrl={
          activePost?.cutoutImageUrl ?? activePost?.sourceImageUrl ?? null
        }
        aspectRatio={
          activePost ? aspectByPlatform[activePost.platform ?? network] : "1/1"
        }
        productName={activePost?.product_name}
        category={
          activePost
            ? detectedProducts.find(
                (d) => d.product_name === activePost.product_name,
              )?.category ??
              activePost.visualMock?.category ??
              null
            : null
        }
        storeContext={storeName}
        onSelect={(dataUrl) => {
          if (activePost) setPostImage(activePost.id, dataUrl);
          setChangeImageFor(null);
        }}
      />

      <Dialog
        open={!!sourcePost}
        onOpenChange={(v) => !v && setSourceImageFor(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image source du catalogue</DialogTitle>
          </DialogHeader>
          {sourcePost?.sourceImageUrl ? (
            <img
              src={sourcePost.sourceImageUrl}
              alt="Source catalogue"
              className="max-h-[70vh] w-full object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune image source disponible.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
