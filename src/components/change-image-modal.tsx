import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Crop as CropIcon,
  Loader2,
  FileImage,
  Sparkles,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { CropModal, type CropBox } from "@/components/crop-modal";
import {
  base64ToBlobUrl,
  getPdfPageCount,
  renderPdfPageToDataUrl,
  cropImageUrl,
} from "@/lib/pdf-browser";
import { isBrandedProduct } from "@/lib/brand-detection";
import { toast } from "sonner";

export type ImageSource = "catalog" | "ai" | "field" | "upload";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pdfBase64?: string;
  currentImageUrl?: string | null;
  aspectRatio: string; // e.g. "16/9"
  onSelect: (dataUrl: string, source?: ImageSource) => void;
  productName?: string;
  category?: string | null;
  rayon?: string | null;
  storeContext?: string | null;
};

type Tab = "catalog" | "ai" | "field" | "upload";

export function ChangeImageModal({
  open,
  onOpenChange,
  pdfBase64,
  currentImageUrl,
  aspectRatio,
  onSelect,
  productName,
  category,
  rayon,
  storeContext,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingSource, setPendingSource] = useState<ImageSource>("catalog");
  const [tab, setTab] = useState<Tab>(() => (pdfBase64 ? "catalog" : "ai"));
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const branded = isBrandedProduct(productName);

  useEffect(() => {
    if (!open) return;
    // Smart default tab: branded → catalog, otherwise keep current.
    if (branded && pdfBase64) setTab("catalog");
  }, [open, branded, pdfBase64]);

  useEffect(() => {
    if (!open || !pdfBase64) return;
    const url = base64ToBlobUrl(pdfBase64);
    setPdfUrl(url);
    let cancelled = false;
    (async () => {
      try {
        setLoadingThumbs(true);
        const n = await getPdfPageCount(url);
        if (cancelled) return;
        setPageCount(n);
        const limit = Math.min(n, 8);
        const out: Record<number, string> = {};
        for (let p = 1; p <= limit; p++) {
          out[p] = await renderPdfPageToDataUrl(url, p, 480);
          if (cancelled) return;
          setThumbs({ ...out });
        }
      } catch (e) {
        console.warn("Page thumbnail render failed", e);
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [open, pdfBase64]);

  const handleUpload = (file: File, source: ImageSource) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setPendingSource(source);
      setCropUrl(url);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const generateAi = async () => {
    if (!productName) {
      toast.error("Nom du produit manquant.");
      return;
    }
    if (branded) {
      toast.warning(
        "Pour les produits de marque, utilisez l'image catalogue ou importez une photo produit.",
      );
      return;
    }
    setGenerating(true);
    setAiPreview(null);
    try {
      const res = await fetch("/api/generate-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          category,
          rayon,
          storeContext,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        dataUrl?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok || !json.dataUrl) {
        toast.error(json.message || json.error || "Génération impossible.");
        return;
      }
      setAiPreview(json.dataUrl);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Upload }[] = [
    ...(pdfBase64
      ? [{ id: "catalog" as Tab, label: "Catalogue", icon: FileImage }]
      : []),
    { id: "ai", label: "Image IA", icon: Sparkles },
    { id: "field", label: "Photo terrain", icon: Camera },
    { id: "upload", label: "Import manuel", icon: Upload },
  ];

  return (
    <>
      <Dialog open={open && !cropOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Source du visuel{productName ? ` — ${productName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      tab === t.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {currentImageUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPendingSource("catalog");
                  setCropUrl(currentImageUrl);
                  setCropOpen(true);
                }}
              >
                <CropIcon className="mr-1.5 h-4 w-4" /> Recadrer l'image actuelle
              </Button>
            )}

            {tab === "catalog" && pdfBase64 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileImage className="h-4 w-4" /> Choisir une page du catalogue
                  {loadingThumbs && (
                    <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: pageCount }).map((_, i) => {
                    const p = i + 1;
                    const src = thumbs[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!src}
                        onClick={() => {
                          if (!src) return;
                          setPendingSource("catalog");
                          setCropUrl(src);
                          setCropOpen(true);
                        }}
                        className="group relative aspect-[3/4] overflow-hidden rounded-md border border-border bg-muted hover:border-primary disabled:opacity-50"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={`Page ${p}`}
                            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          p. {p}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "ai" && (
              <div className="space-y-3">
                {branded ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      Pour les produits de marque, utilisez l'image catalogue
                      ou importez une photo produit. Komaag ne génère pas de
                      faux packaging de marque.
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Génère une photo réaliste de{" "}
                    <span className="font-medium text-foreground">
                      {productName || "ce produit"}
                    </span>{" "}
                    sans texte, sans prix, sans logo. Le visuel Komaag (prix,
                    badge, magasin) est ajouté ensuite par-dessus.
                  </p>
                )}

                <Button
                  onClick={generateAi}
                  disabled={generating || branded || !productName}
                  className="gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating
                    ? "Génération en cours…"
                    : "Générer une image produit"}
                </Button>

                {aiPreview && (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-md border border-border bg-muted">
                      <img
                        src={aiPreview}
                        alt="Image IA"
                        className="h-auto w-full max-h-[40vh] object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setPendingSource("ai");
                          setCropUrl(aiPreview);
                          setCropOpen(true);
                        }}
                      >
                        <CropIcon className="mr-1.5 h-4 w-4" /> Utiliser cette image
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={generateAi}
                        disabled={generating}
                      >
                        Régénérer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(tab === "field" || tab === "upload") && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {tab === "field"
                    ? "Importez une photo prise en magasin (recommandé pour du contenu humain et authentique)."
                    : "Importez une image depuis votre ordinateur."}
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                  {tab === "field" ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {tab === "field" ? "Importer une photo terrain" : "Importer une image"}
                  <input
                    type="file"
                    accept="image/*"
                    capture={tab === "field" ? "environment" : undefined}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f, tab === "field" ? "field" : "upload");
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CropModal
        open={cropOpen}
        onOpenChange={(v) => {
          setCropOpen(v);
          if (!v) setCropUrl(null);
        }}
        imageUrl={cropUrl}
        aspectRatio={aspectRatio}
        title="Recadrer le visuel"
        onConfirm={async (box: CropBox) => {
          if (!cropUrl) return;
          try {
            const { base64, contentType } = await cropImageUrl(cropUrl, box);
            const dataUrl = `data:${contentType};base64,${base64}`;
            onSelect(dataUrl, pendingSource);
            onOpenChange(false);
          } catch (e) {
            console.error(e);
            toast.error("Recadrage impossible.");
          }
        }}
      />

      <span hidden>{pdfUrl}</span>
    </>
  );
}
