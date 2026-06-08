import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Crop as CropIcon, Loader2, FileImage } from "lucide-react";
import { CropModal, type CropBox } from "@/components/crop-modal";
import {
  base64ToBlobUrl,
  getPdfPageCount,
  renderPdfPageToDataUrl,
  cropImageUrl,
} from "@/lib/pdf-browser";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pdfBase64?: string;
  currentImageUrl?: string | null;
  aspectRatio: string; // e.g. "16/9"
  onSelect: (dataUrl: string) => void;
};

export function ChangeImageModal({
  open,
  onOpenChange,
  pdfBase64,
  currentImageUrl,
  aspectRatio,
  onSelect,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

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

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setCropUrl(url);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Dialog open={open && !cropOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Changer l'image</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                Importer une image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
              {currentImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCropUrl(currentImageUrl);
                    setCropOpen(true);
                  }}
                >
                  <CropIcon className="mr-1.5 h-4 w-4" /> Recadrer l'image actuelle
                </Button>
              )}
            </div>

            {pdfBase64 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Importez une image depuis votre ordinateur.
              </p>
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
            onSelect(dataUrl);
            onOpenChange(false);
          } catch (e) {
            console.error(e);
            toast.error("Recadrage impossible.");
          }
        }}
      />

      {/* keep pdfUrl referenced to satisfy linter; revocation handled in effect */}
      <span hidden>{pdfUrl}</span>
    </>
  );
}
